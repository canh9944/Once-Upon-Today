export type AdsConexMetrics = {
  revenue: number;
  impressions: number;
  views: number;
  cpm: number;
  rpm: number;
};

export type AdsConexSite =
  | { site: string; status: 'ok'; metrics: AdsConexMetrics }
  | { site: string; status: 'empty' | 'error' };

export type AdsConexReport = { configured: boolean; sites: AdsConexSite[] };
