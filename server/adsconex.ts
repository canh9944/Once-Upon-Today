import { getPlatform } from './platform';
import type { DateRange } from '../shared/analytics';
import type { AdsConexReport, AdsConexSite } from '../shared/adsconex';
import { lifestoriesMarkets } from '../shared/lifestories-markets';

const sites = Object.keys(lifestoriesMarkets);

function metric(value: unknown, count = false): number {
  const number = typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)
    ? Number(value)
    : value;
  if (typeof number !== 'number' || !Number.isFinite(number) ||
      (count && (!Number.isSafeInteger(number) || number < 0))) {
    throw new Error('Invalid AdsConex metric');
  }
  return number;
}

async function fetchSite(site: string, range: DateRange, token: string): Promise<AdsConexSite> {
  const url = new URL('https://adsconex.com/api/revenue/stats');
  url.search = new URLSearchParams({
    api_token: token,
    start_day: range.start,
    end_day: range.end,
    site,
  }).toString();

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn('AdsConex report HTTP error', { site, status: response.status });
      return { site, status: 'error' };
    }
    const result = await response.json();
    if ((result?.code !== '1' && result?.code !== 1) || !Array.isArray(result.data)) {
      console.warn('AdsConex report rejected or invalid', { site });
      return { site, status: 'error' };
    }
    if (!result.data.length) return { site, status: 'empty' };
    const [row] = result.data;
    if (result.data.length !== 1 || row?.site !== site) return { site, status: 'error' };
    const views = metric(row.views, true);
    const impressions = metric(row.impressions, true);
    if (!views && !impressions && row.revenue === null && row.cpm === null && row.rpm === null) {
      return { site, status: 'empty' };
    }
    return {
      site,
      status: 'ok',
      metrics: {
        revenue: metric(row.revenue),
        impressions,
        views,
        cpm: metric(row.cpm),
        rpm: metric(row.rpm),
      },
    };
  } catch (error) {
    console.warn('AdsConex report request or parsing failed', {
      site,
      reason: error instanceof SyntaxError ? 'invalid-json' : error instanceof Error && error.message === 'Invalid AdsConex metric'
        ? 'invalid-metric' : error instanceof Error ? error.name : 'unknown',
    });
    return { site, status: 'error' };
  }
}

export async function adsConexReport(range: DateRange): Promise<AdsConexReport> {
  const token = getPlatform().env.ADSCONEX_API_TOKEN?.trim();
  if (!token) return { configured: false, sites: [] };

  const rows: AdsConexSite[] = [];
  // Keep concurrent upstream connections within the Workers per-request limit.
  for (let index = 0; index < sites.length; index += 5) {
    rows.push(...await Promise.all(sites.slice(index, index + 5).map(site => fetchSite(site, range, token))));
  }
  return { configured: true, sites: rows };
}
