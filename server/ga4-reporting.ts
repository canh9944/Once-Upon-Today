import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { importPKCS8, SignJWT } from 'jose';
import { getPlatform } from './platform';
import { GA4_PROPERTIES } from '../shared/ga4-properties';
import type { DateRange } from '../shared/analytics';
import type { Ga4Article, Ga4Articles, Ga4Property, Ga4Report, Ga4Row } from '../shared/ga4';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const metricNames = ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate'];
let tokenCache: { key: string; expires: number; pending: Promise<string> } | undefined;

function accessToken(email: string, privateKey: string) {
  const key = createHash('sha256').update(JSON.stringify([email, privateKey])).digest('hex');
  if (tokenCache?.key === key && tokenCache.expires > Date.now()) return tokenCache.pending;
  const entry = { key, expires: Infinity, pending: exchangeToken(email, privateKey).then(result => {
    entry.expires = result.expires;
    return result.token;
  }) };
  tokenCache = entry;
  void entry.pending.catch(() => { if (tokenCache === entry) tokenCache = undefined; });
  return entry.pending;
}

async function exchangeToken(email: string, privateKey: string) {
  const signingKey = await importPKCS8(privateKey, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/analytics.readonly' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(email)
    .setAudience(tokenUrl)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(signingKey);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error('GA4 token exchange failed');
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !data.access_token ||
      typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in)) {
    throw new Error('Invalid GA4 token response');
  }
  // Limit caching by the actual lifetime reported by Google.
  return { token: data.access_token as string, expires: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
}

function runReport(property: Ga4Property, range: DateRange, token: string, metrics: string[], options?: object) {
  return fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property.propertyId}:runReport`, {
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: range.start, endDate: range.end }],
        metrics: metrics.map(name => ({ name })),
        ...options,
      }),
    });
}

async function reportProperty(property: Ga4Property, range: DateRange, token: string): Promise<Ga4Row> {
  try {
    const response = await runReport(property, range, token, metricNames);
    if (response.status === 403) return { ...property, status: 'forbidden' };
    if (!response.ok) return { ...property, status: 'error' };
    const data = await response.json();
    const headers = data.metricHeaders;
    if (!Array.isArray(headers) || !metricNames.every((name, index) => headers[index]?.name === name)) {
      return { ...property, status: 'error' };
    }
    if (data.rows === undefined || (Array.isArray(data.rows) && data.rows.length === 0)) {
      return { ...property, status: 'empty' };
    }
    const values = data.rows?.[0]?.metricValues;
    if (data.rows.length !== 1 || !Array.isArray(values) || values.length !== metricNames.length ||
        values.some(item => typeof item?.value !== 'string' || !item.value.trim())) {
      return { ...property, status: 'error' };
    }
    const [activeUsers, sessions, views, engagementRate] = values.map(item => Number(item.value));
    if (![activeUsers, sessions, views].every(value => Number.isSafeInteger(value) && value >= 0) ||
        !Number.isFinite(engagementRate) || engagementRate < 0 || engagementRate > 1) {
      return { ...property, status: 'error' };
    }
    return { ...property, status: 'ok', activeUsers, sessions, views, engagementRate };
  } catch {
    return { ...property, status: 'error' };
  }
}

async function reportArticles(property: Ga4Property, range: DateRange, token: string): Promise<Ga4Articles> {
  try {
    const response = await runReport(property, range, token, ['screenPageViews', 'activeUsers', 'sessions'], {
      dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: {
        matchType: 'FULL_REGEXP', value: '^/(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:blog|posts)/[^/]+/?$',
      } } },
      orderBys: [
        { metric: { metricName: 'screenPageViews' }, desc: true },
        { dimension: { dimensionName: 'hostName' } },
        { dimension: { dimensionName: 'pagePath' } },
      ],
      limit: '1000',
    });
    if (response.status === 403) return { status: 'forbidden' };
    if (!response.ok) return { status: 'error' };
    const data = await response.json();
    const rows = (data.rows ?? []).map((row: {
      dimensionValues: { value: string }[];
      metricValues: { value: string }[];
    }) => {
      const [host, path] = row.dimensionValues.map(item => item.value);
      const [views, activeUsers, sessions] = row.metricValues.map(item => Number(item.value));
      if (!host || !path || ![views, activeUsers, sessions].every(value => Number.isSafeInteger(value) && value >= 0)) {
        throw new Error('Invalid GA4 article report');
      }
      return { host, path, views, activeUsers, sessions };
    });
    return { status: 'ok', rows, total: Math.max(rows.length, Number(data.rowCount) || 0) };
  } catch {
    return { status: 'error' };
  }
}

async function reportProperties<Row>(properties: readonly Ga4Property[], load: (property: Ga4Property) => Promise<Row>) {
  const rows: Row[] = [];
  // Keep concurrent outbound connections below the Workers per-request limit.
  for (let index = 0; index < properties.length; index += 5) {
    rows.push(...await Promise.all(properties.slice(index, index + 5).map(load)));
  }
  return rows;
}

function combineArticles(reports: Ga4Articles[]): Ga4Articles {
  const merged = new Map<string, Ga4Article>();
  const complete = reports.filter(report => report.status === 'ok');
  if (!complete.length) return { status: reports.every(report => report.status === 'forbidden') ? 'forbidden' : 'error' };
  for (const report of complete) {
    for (const row of report.rows) {
      const key = JSON.stringify([row.host, row.path]);
      const previous = merged.get(key);
      if (previous) {
        previous.views += row.views;
        previous.activeUsers += row.activeUsers;
        previous.sessions += row.sessions;
      } else {
        merged.set(key, { ...row });
      }
    }
  }
  const rows = [...merged.values()].sort((a, b) => b.views - a.views);
  return {
    status: 'ok', rows, total: rows.length,
    truncated: complete.some(report => report.total > report.rows.length),
    unavailable: reports.length - complete.length,
  };
}

export async function ga4Report(range: DateRange, property?: Ga4Property, view: 'overview' | 'articles' = 'overview'): Promise<Ga4Report> {
  const { env, kind } = getPlatform();
  const path = kind === 'node' ? env.GOOGLE_APPLICATION_CREDENTIALS : undefined;
  if (!env.GA4_SERVICE_ACCOUNT_JSON && !path) return { status: 'unconfigured' };

  let token: string;
  try {
    const credentials = JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON || await readFile(path!, 'utf8'));
    if (credentials.type !== 'service_account' ||
        typeof credentials.client_email !== 'string' || typeof credentials.private_key !== 'string') {
      return { status: 'authorizationError' };
    }
    token = await accessToken(credentials.client_email, credentials.private_key);
  } catch {
    return { status: 'authorizationError' };
  }

  const properties = property ? [property] : GA4_PROPERTIES;
  if (view === 'articles') {
    const reports = await reportProperties(properties, item => reportArticles(item, range, token));
    return { status: 'ok', rows: [], articles: property ? reports[0] : combineArticles(reports) };
  }
  const rows = await reportProperties(properties, item => reportProperty(item, range, token));
  return { status: 'ok', rows };
}
