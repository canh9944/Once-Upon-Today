CREATE TABLE IF NOT EXISTS traffic_views (
 id TEXT PRIMARY KEY, visitor TEXT NOT NULL, sessionId TEXT NOT NULL, postId TEXT NOT NULL,
 genre TEXT NOT NULL, postCountry TEXT NOT NULL, country TEXT NOT NULL,
 source TEXT NOT NULL, medium TEXT NOT NULL, campaign TEXT NOT NULL, fanpage TEXT NOT NULL,
 referrer TEXT NOT NULL, landing TEXT NOT NULL, language TEXT NOT NULL, device TEXT NOT NULL,
 engagedMs INTEGER NOT NULL DEFAULT 0, engaged INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS traffic_date ON traffic_views(createdAt);
CREATE INDEX IF NOT EXISTS traffic_session ON traffic_views(sessionId);
CREATE TABLE IF NOT EXISTS fanpages (
 slug TEXT PRIMARY KEY, name TEXT NOT NULL, adChannel TEXT UNIQUE, createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS adsense_connection (
 id TEXT PRIMARY KEY, accountId TEXT NOT NULL, accountName TEXT NOT NULL, timeZone TEXT NOT NULL,
 refreshToken TEXT NOT NULL, userId TEXT NOT NULL, updatedAt TEXT NOT NULL, leaseUntil INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS adsense_reports (
 key TEXT PRIMARY KEY, accountId TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
 kind TEXT NOT NULL, currency TEXT NOT NULL, payload TEXT NOT NULL, syncedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS adsense_report_range ON adsense_reports(accountId,start,end);
