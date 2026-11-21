# Traffic attribution and revenue reporting

The admin overview shows traffic. Open Revenue in the admin menu to view
AdsConex and AdSense reports for the selected date range.

Traffic opens on the last seven days. Overview shows the totals and the
country breakdown. Articles shows views, active users and sessions by
hostname and path. The country selector applies to both tabs. All countries
sums the selected metrics across GA4 properties. Users may be counted by more
than one property. Each property's article report includes up to 1,000 URLs
ordered by views. Table headers sort columns and the fields below them filter
by text or minimum numeric value.

The service account needs Viewer access
to each property and the Google Analytics Data API enabled in its Cloud project.
For Node.js, set `GOOGLE_APPLICATION_CREDENTIALS` to the service account JSON file.
For Cloudflare, set `GA4_SERVICE_ACCOUNT_JSON` as a Worker secret.

Set `ADSCONEX_API_TOKEN` in `.env.local` for local Node.js development or
as a Worker secret for production. AdsConex returns revenue without a
currency code, so the dashboard displays the amount as provided.

## Production setup

Apply migrations before deploying the new dashboard:

```sh
npm run db:migrate:cloudflare
```

The new tables preserve existing posts, accounts and legacy event counts. Traffic
attribution starts collecting after deployment; historical events do not contain
Fanpage/country/session attributes and are not invented or backfilled.

## Facebook Fanpages

In Admin → Traffic intelligence → Facebook Fanpages, add a Fanpage with a stable
tracking key, for example `family-stories-en`. Use the link builder for posts:

```text
https://onceupontoday.site/en/posts/example?utm_source=facebook&utm_medium=social&fb_page=family-stories-en&utm_campaign=november
```

`fb_page` identifies the Fanpage. `utm_campaign` identifies the campaign, not the
Fanpage. Facebook referrer domains or `fbclid` alone identify Facebook traffic but
cannot reliably identify a Fanpage: those views appear as unknown Fanpage.
Click IDs and full referrer URLs are discarded. Use stable non-personal tracking
keys; never put names, emails or other personal data in campaign parameters.

Attribution persists through internal navigation within a browser-tab session.
A new tagged campaign or 30 minutes of inactivity starts a new session. Direct
visits in a new session are not credited to an old Facebook campaign. Unique
readers are pseudonymous browser IDs hashed by the server, not signed-in users.

Dashboard traffic uses UTC and includes a date range of up to 90 days. Countries
come from Cloudflare request geolocation; outside Cloudflare they may be unknown.
Visitor country and the story's configured country are separate breakdowns.
Genre/country metadata is captured when the page view arrives, so later edits do
not rewrite historical traffic attribution. A view is counted once per event ID.
Engagement means 30 seconds of active reading, or 10 seconds plus 50% page scroll.
Hidden-tab time is excluded; the server bounds reported time by elapsed time.
These browser events can be blocked and are not a billing/audited visitor count.

## AdSense read-only OAuth

1. Enable **AdSense Management API** in your Google Cloud project.
2. Add this authorized redirect URI to a Google OAuth Web client:

   `https://onceupontoday.site/api/adsense/callback`

3. Use existing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, or set separate
   server-only `ADSENSE_CLIENT_ID` / `ADSENSE_CLIENT_SECRET`.
4. Set `ADSENSE_ACCOUNT_ID=accounts/pub-7681125837419532` (the website publisher).
   Optionally set `ADSENSE_CURRENCY`, e.g. `USD`; blank keeps the report currency.
5. In the dashboard, click Connect AdSense and authorize the publisher account,
   then click Sync AdSense reports for the selected date range.

OAuth requests only `adsense.readonly`. Consent-screen/app verification rules may
apply to your Google project. Refresh tokens are encrypted with AES-256-GCM using
a key derived from `SESSION_SECRET`; keep that secret stable or reconnect after
rotation. Tokens never go to the browser, API status responses or transfer bundles.
Disconnect removes stored credentials but retains already imported reports.

Reports are cached in D1/SQLite by publisher, date range and breakdown. Explicit
sync refreshes estimated earnings, impressions, page views and clicks; a lease
prevents simultaneous syncs. Failed/truncated/oversized reports are not represented
as complete data. No report means unavailable (`—`), not zero earnings.

AdSense earnings are **Google's estimated earnings**, not finalized payments.
Reports use the AdSense account's reporting time zone, shown in the dashboard;
traffic dates use UTC. AdSense RPM uses AdSense page views, not app traffic counts.
Country totals use the provider's totals row; different report breakdowns are never
added together to manufacture a larger total. Reporting warnings are retained.

## Revenue attribution limits and channel setup

For measured revenue per Fanpage, create one unique custom channel for each
Fanpage in AdSense and enter its numeric channel ID in Fanpage settings. The
website sets `data-ad-channel` on its manual ad units **before** requesting ads.
The attribution session carries that Fanpage channel to subsequent story pages.

Channel earnings only cover tagged units, not all Auto ads. Existing static channel
assignments can overlap: do not add channel totals to country/page totals or use
traffic shares to allocate revenue. Missing mappings remain unavailable. A
Fanpage's AdSense channel cannot be reused by another Fanpage in this dashboard.

Genre revenue uses AdSense's page-URL report and the story metadata at sync time.
Unrecognized/canonicalized URLs stay unknown. Historical genre changes cannot be
reconstructed from a page URL. If Google does not support a requested breakdown,
the dashboard keeps it unavailable and reports partial sync status.

References: [read-only reporting API](https://developers.google.com/adsense/management/reference/rest/v2/accounts.reports/generate),
[custom channel ad code](https://support.google.com/adsense/answer/10078316),
[page URL dimension](https://developers.google.com/adsense/management/reference/rest/v2/Dimension).

Backups preserve traffic, Fanpage mappings and synced reports. AdSense credentials
are intentionally excluded; reconnect after a restore. Local public API preview
does not send traffic to production or expose admin data. Integration tests use
temporary databases and fake Google responses; real connection requires consent
and access to the publisher's AdSense account. Nothing is deployed automatically.
