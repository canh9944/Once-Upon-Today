export type Ga4Property = { country: string; name: string; propertyId: string };
export type Ga4Row = Ga4Property & (
  | { status: 'ok'; activeUsers: number; sessions: number; views: number; engagementRate: number }
  | { status: 'empty' | 'forbidden' | 'error' }
);
export type Ga4Report =
  | { status: 'ok'; rows: Ga4Row[]; articles?: Ga4Articles }
  | { status: 'unconfigured' | 'authorizationError' };

export type Ga4Article = { host: string; path: string; views: number; activeUsers: number; sessions: number };
export type Ga4Articles =
  | { status: 'ok'; rows: Ga4Article[]; total: number; truncated?: boolean; unavailable?: number }
  | { status: 'forbidden' | 'error' };
