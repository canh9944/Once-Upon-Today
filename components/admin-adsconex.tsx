'use client';

import { useEffect, useState } from 'react';
import type { DateRange } from '@/shared/analytics';
import type { AdsConexMetrics, AdsConexReport, AdsConexSite } from '@/shared/adsconex';
import { useAuth } from './auth-provider';
import AnalyticsStatus from './analytics-status';
import { Card } from './ui/card';
import AnalyticsTable, { type AnalyticsColumn } from './analytics-table';
import { useSite } from './site-context';

export default function AdminAdsConex({ start, end, refresh }: DateRange & { refresh: number }) {
  const { locale, t } = useSite();
  const { refresh: refreshAuth } = useAuth();
  const [result, setResult] = useState<AdsConexReport | 'error' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    async function load() {
      try {
        const response = await fetch('/api/analytics/adsconex?' + new URLSearchParams({ start, end }), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401 && !controller.signal.aborted) await refreshAuth();
        if (!response.ok) throw new Error();
        const report: AdsConexReport = await response.json();
        if (!controller.signal.aborted) setResult(report);
      } catch {
        if (!controller.signal.aborted) setResult('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [start, end, refresh, refreshAuth]);

  const vi = locale === 'vi';
  const count = new Intl.NumberFormat(locale);
  const amount = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const metric = (id: keyof AdsConexMetrics, label: string, format: Intl.NumberFormat): AnalyticsColumn<AdsConexSite> => ({
    id, label, numeric: true,
    value: row => row.status === 'ok' ? row.metrics[id] : null,
    render: row => row.status === 'ok' ? format.format(row.metrics[id]) : '?',
  });
  const columns: AnalyticsColumn<AdsConexSite>[] = [
    { id: 'site', label: 'Website', value: row => row.site, render: row => <>{row.site}{row.status !== 'ok' && <AnalyticsStatus state={row.status}>{row.status === 'empty'
      ? (vi ? 'Chưa có dữ liệu' : 'No data')
      : (vi ? 'Không tải được dữ liệu' : 'Unable to load data')}</AnalyticsStatus>}</> },
    metric('revenue', vi ? 'Doanh thu' : 'Revenue', amount),
    metric('views', t.views, count),
    metric('impressions', vi ? 'Lượt hiển thị' : 'Impressions', count),
    metric('cpm', 'CPM', amount), metric('rpm', 'RPM', amount),
  ];
  return (
    <Card className="analytics-panel" aria-busy={result === null}>
      <h2>AdsConex</h2>
      {result === null && <AnalyticsStatus state="loading">{t.loading}</AnalyticsStatus>}
      {result === 'error' && <AnalyticsStatus state="error">{t.requestError}</AnalyticsStatus>}
      {result && result !== 'error' && (result.configured ? (
        <AnalyticsTable rows={result.sites} columns={columns} rowKey={row => row.site} defaultSortColumn="revenue" />
      ) : <AnalyticsStatus state="error">{vi ? 'Chưa cấu hình token AdsConex.' : 'AdsConex token is not configured.'}</AnalyticsStatus>)}
    </Card>
  );
}
