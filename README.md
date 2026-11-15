# Once Upon Today

A multilingual blog built with Next.js App Router, Tailwind CSS 4, shadcn/ui (Radix), Tiptap and Recharts. The API now runs inside Next.js; no separate NestJS process is required.

## Run locally

Requires Node.js 22.12+ and npm. Keep your existing `.env.local`; copy `.env.example` only if it does not exist, then set your admin credentials and a random `SESSION_SECRET` of at least 32 characters.

```sh
npm ci
npm run db:import
npm run dev
```

Open http://localhost:3000/en or http://localhost:3000/en/admin. Hot reload is enabled by `next dev`. There is no default admin password. Existing NestJS SQLite/legacy JSON data is imported without deleting the original. The active database is `data/app.sqlite` and uploaded images are in `data/uploads` by default. `backend/` is retained as an archived implementation and source backup.

For local preview using the production API, skip `npm run db:import` and configure `CONTENT_API_URL` as described below. This mode does not create a local database.

## Deploy and migrate

### Read production content locally through the API

Set `CONTENT_API_URL=https://onceupontoday.site` in `.env.local` and run `npm run dev`. Local pages fetch public posts, article details and search suggestions directly from the server on each request (`cache: no-store`). Uploaded cover/inline images use the server URL. No local database, image copies, background sync or polling are needed. Production must be reachable.

This mode only reads public content. Local analytics are ignored and sign-in opens the production editorial page; local writes are blocked. No production cookies or credentials are forwarded. The setting applies only to Next.js development; production builds and hosting continue to use their own storage. Remove `CONTENT_API_URL` to develop against a separate database again (run `npm run db:import` first if needed).

With local dev running in API mode, `npm run test:api-content` verifies live content, remote images, search and article pages, blocked local writes, and that local database files remain absent.

See [Cloudflare, VPS, backup and migration guide](docs/deployment.md) for the complete setup and commands.

- Cloudflare: Next.js + OpenNext Workers, D1 database, R2 media. `npm run build:cloudflare`, then `npm run deploy:cloudflare` after setting account resources, secrets and domain.
- VPS: `npm run build`, `npm start`, or Docker Compose with a persistent data volume and HTTPS reverse proxy.
- Provider-specific code lives in `server/platform/`; HTTP/auth/repository code is shared.
- `npm run backup -- local backups/example` and `npm run restore -- cloudflare backups/example` move versioned JSON and images. Reverse the providers to move back. Restore requires an empty destination. Sessions are excluded.
- Free quotas are finite. Local preview does not prove Workers Free CPU compatibility; measure SSR and password authentication after deployment before opening traffic.

Cloudflare production deployment is pending account login, actual D1 ID and domain configuration. No paid service has been enabled.

Quick setup for your own Cloudflare account:

```sh
npm run cloudflare:login
npm run cloudflare:d1:create
npm run cloudflare:r2:create
# Set the returned D1 database_id and production HTTPS APP_URL in wrangler.jsonc.
npm run db:migrate:cloudflare
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run build:cloudflare
npm run deploy:cloudflare
```

For local Workers preview, copy `.dev.vars.example` to `.dev.vars`, replace the example credentials, run `npm run db:migrate:cloudflare:local`, then `npm run preview:cloudflare` after building. `.env.local` remains the environment for the regular Next.js Node server. R2 stays private: images are served through `/api/uploads/...` by the Worker. See the deployment guide for Google OAuth secrets and importing existing data before opening traffic.

The API entry point is `app/api/[...path]/route.ts`; authentication, posts, analytics and uploads execute in `server/`. Server rendered pages read the repository directly. No backend URL or separate API service is needed. The Cloudflare configuration follows the [OpenNext Workers setup](https://opennext.js.org/cloudflare/get-started).

## UI conventions

Use the existing shadcn/ui components whenever they cover an interaction. The Carousel (Embla), Popover, Command/Combobox, Select and Slider sources come from the official new-york registry and reuse the existing Radix, Button, Card, Dialog and theme setup. Domain components compose those primitives with API data and i18n; avoid implementing duplicate keyboard, overlay or carousel mechanics.

## Features

Country and genre filters in the header; centered search; all countries uses English UI and shows all stories. All 50 selectable country/market options have an explicit language mapping across 43 locales. Shared dictionaries cover public pages, search suggestions, all eight story categories, authentication and the editorial interface. US-UK is the first country/market option and combines US, GB and legacy England codes; European countries follow in editorial language-priority order, then Asian markets. Country names and dates follow the selected locale; Belgium retains French, Dutch and German editions. Published article content keeps its original language.

Sticky public header, plus a responsive related-story carousel at the end of articles (same-category/topic/language/market ranking, swipe/arrow navigation, and current/draft/duplicate exclusion). Light/dark theme, reading font and size controls, responsive layouts, login/signup dialog, password visibility toggle and Google OAuth. Only configured admins can write stories. Admin routes retain the sidebar while opening separate create/edit pages. Rich text supports up to 500,000 HTML characters; author defaults to Once Upon Today. Reusable cover/inline image upload converts images in the browser and validates allowed raster image types/server limits. Analytics deduplicate daily views and likes and display Recharts charts. Public drafts remain inaccessible. AdSense uses `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_SLOT`; Google approval is separate.

## Verify

```sh
npm run typecheck
npm run build
npm run test:smoke
npm run test:browser
npm run build:cloudflare
npm run test:cloudflare
```

The browser test uses installed Microsoft Edge. API/browser tests use temporary SQLite databases. The Cloudflare test uses temporary workerd/D1/R2 resources and checks migration to SQLite/filesystem. Tests never use production Cloudflare data. Google account login, remote free-tier CPU limits and Docker require separate deployment verification.
