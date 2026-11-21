'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { analyticsCopy } from '@/lib/analytics-i18n';
import type { DateRange } from '@/shared/analytics';
import { GA4_PROPERTIES } from '@/shared/ga4-properties';
import type { Ga4Article, Ga4Report, Ga4Row } from '@/shared/ga4';
import { englishMarket } from '@/shared/countries';
import { lifestoriesMarkets } from '@/shared/lifestories-markets';
import { useAuth } from './auth-provider';
import { useSite } from './site-context';
import AnalyticsStatus from './analytics-status';
import { Card } from './ui/card';
import { Button } from './ui/button';
import AnalyticsTable, { type AnalyticsColumn } from './analytics-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const articleUrl = (row: Ga4Article) => `https://${row.host}${row.path}`;

export default function AdminGa4({ start, end, refresh }: DateRange & { refresh: number }) {
  const { locale, t } = useSite();
  const { refresh: refreshAuth } = useAuth();
  const copy = analyticsCopy(locale);
  const [market, setMarket] = useState('all');
  const [view, setView] = useState<'overview' | 'articles'>('overview');
  const [result, setResult] = useState<Ga4Report | 'error' | null>(null);
  const [clipboard, setClipboard] = useState<{ url: string; copied: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    async function load() {
      try {
        const query = new URLSearchParams({ start, end, view });
        if (market !== 'all') query.set('country', market);
        const response = await fetch('/api/analytics/ga4?' + query, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401 && !controller.signal.aborted) await refreshAuth();
        if (!response.ok) throw new Error();
        const report: Ga4Report = await response.json();
        if (!controller.signal.aborted) setResult(report);
      } catch {
        if (!controller.signal.aborted) setResult('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [start, end, refresh, refreshAuth, market, view]);

  const count = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const regions = new Intl.DisplayNames([locale], { type: 'region' });
  const marketName = (row: { country: string; name: string }) => row.country === 'all' || locale === 'en' ? row.name : regions.of(row.country) || row.name;
  const statusText = (status: string) => status === 'empty' ? copy.noData : status === 'forbidden' ? copy.ga4Forbidden : copy.ga4Unavailable;
  const metric = (id: 'activeUsers' | 'sessions' | 'views' | 'engagementRate', label: string): AnalyticsColumn<Ga4Row> => ({
    id, label, numeric: true,
    value: row => row.status === 'ok' ? row[id] * (id === 'engagementRate' ? 100 : 1) : null,
    render: row => row.status === 'ok' ? (id === 'engagementRate' ? percent.format(row[id]) : count.format(row[id])) : '—',
  });
  const overview: AnalyticsColumn<Ga4Row>[] = [
    { id: 'country', label: copy.country, value: marketName,
      render: row => <>{marketName(row)}{row.status !== 'ok' && <AnalyticsStatus state={row.status === 'empty' ? 'empty' : 'error'}>{statusText(row.status)}</AnalyticsStatus>}</> },
    metric('activeUsers', copy.ga4ActiveUsers), metric('sessions', copy.sessions),
    metric('views', t.views), metric('engagementRate', copy.rate),
  ];
  const articleMetric = (id: 'views' | 'activeUsers' | 'sessions', label: string): AnalyticsColumn<Ga4Article> => ({
    id, label, numeric: true, value: row => row[id], render: row => count.format(row[id]),
  });
  const articleCountry = (row: Ga4Article) => {
    const host = row.host.toLowerCase().replace(/\.$/, '');
    const country = Object.hasOwn(lifestoriesMarkets, host) ? lifestoriesMarkets[host] : undefined;
    if (country === englishMarket) return locale === 'vi' ? 'Mỹ - Anh' : 'US - UK';
    return country ? regions.of(country) || country : '—';
  };
  const articleColumns: AnalyticsColumn<Ga4Article>[] = [
    { id: 'host', label: copy.ga4Host, value: row => row.host },
    { id: 'country', label: copy.country, value: articleCountry },
    { id: 'path', label: copy.ga4Path, value: articleUrl, render: row => {
      const url = articleUrl(row);
      const copied = clipboard?.url === url && clipboard.copied;
      return <div className="flex items-start gap-2">
        <span className="block min-w-36 max-w-96 break-all">{url}</span>
        <Button type="button" variant="outline" size="icon" className="shrink-0"
          aria-label={copy.copy} title={copied ? copy.copied : copy.copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setClipboard({ url, copied: true });
            } catch {
              setClipboard({ url, copied: false });
            }
          }}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </Button>
      </div>;
    } },
    articleMetric('views', t.views), articleMetric('activeUsers', copy.ga4ActiveUsers), articleMetric('sessions', copy.sessions),
  ];
  const articles = result && result !== 'error' && result.status === 'ok' ? result.articles : undefined;
  const rows = result && result !== 'error' && result.status === 'ok' ? result.rows : [];
  const available = rows.filter(row => row.status === 'ok');
  const totals = available.reduce((total, row) => ({
    views: total.views + row.views,
    sessions: total.sessions + row.sessions,
    activeUsers: total.activeUsers + row.activeUsers,
    engagedSessions: total.engagedSessions + row.engagementRate * row.sessions,
  }), { views: 0, sessions: 0, activeUsers: 0, engagedSessions: 0 });
  const allRows: Ga4Row[] = market === 'all' && available.length ? [{
    propertyId: 'all', country: 'all', name: copy.ga4Total, status: 'ok',
    views: totals.views, sessions: totals.sessions, activeUsers: totals.activeUsers,
    engagementRate: totals.sessions ? totals.engagedSessions / totals.sessions : 0,
  }, ...rows] : rows;
  return (
    <Card className="analytics-panel" aria-busy={result === null}>
      <div className="analytics-heading">
        <h2>Google Analytics 4</h2>
        <Select value={market} onValueChange={value => { setResult(null); setMarket(value); }}>
          <SelectTrigger aria-label={copy.ga4Market}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.ga4AllMarkets}</SelectItem>
            {GA4_PROPERTIES.map(property => <SelectItem key={property.propertyId} value={property.country}>
              {marketName(property)}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {result === null && <AnalyticsStatus state="loading">{t.loading}</AnalyticsStatus>}
      {result === 'error' && <AnalyticsStatus state="error">{t.requestError}</AnalyticsStatus>}
      {result && result !== 'error' && result.status !== 'ok' && (
        <AnalyticsStatus state="error">
          {result.status === 'unconfigured' ? copy.ga4Unconfigured : copy.ga4AuthorizationError}
        </AnalyticsStatus>
      )}
      <Tabs value={view} onValueChange={value => {
        if (value !== 'overview' && value !== 'articles') return;
        setResult(null);
        setView(value);
      }}>
        <TabsList className="analytics-tabs">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="articles">{t.posts}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {result && result !== 'error' && result.status === 'ok' && <AnalyticsTable rows={allRows} columns={overview} rowKey={row => row.propertyId} defaultSortColumn="views" />}
          {market === 'all' && available.length > 0 && <p className="analytics-hint">{copy.ga4SumHint}</p>}
        </TabsContent>
        <TabsContent value="articles">
          {articles && articles.status !== 'ok' && <AnalyticsStatus state="error">{statusText(articles.status)}</AnalyticsStatus>}
          {articles?.status === 'ok' && <>
            {articles.total > articles.rows.length && <p className="analytics-hint">{copy.ga4ArticleLimit.replace('{limit}', count.format(articles.rows.length)).replace('{total}', count.format(articles.total))}</p>}
            {articles.truncated && <p className="analytics-hint">{copy.ga4CombinedLimit}</p>}
            {!!articles.unavailable && <AnalyticsStatus state="error">{copy.ga4Partial.replace('{count}', count.format(articles.unavailable))}</AnalyticsStatus>}
            <AnalyticsTable key={market} rows={articles.rows} columns={articleColumns} rowKey={row => row.host + ' ' + row.path} defaultSortColumn="views" />
            <p role="status" className={clipboard?.copied === false ? 'error' : 'sr-only'}>
              {clipboard ? clipboard.copied ? copy.copied : t.requestError : ''}
            </p>
            {market === 'all' && <p className="analytics-hint">{copy.ga4SumHint}</p>}
          </>}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
