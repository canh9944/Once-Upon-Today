# Social login

Google, Facebook and Apple use server-side authorization-code flows. The UI uses
the existing shadcn dialog/buttons. `oauth4webapi` validates Facebook/Apple
authorization responses; `jose` verifies Google/Apple signed identity tokens and
creates the Apple client secret. Provider tokens and secrets never go to browser
JavaScript and are not stored in the database.

## Production configuration

Common variables (server only):

```dotenv
APP_URL=https://onceupontoday.site
SESSION_SECRET=<at least 32 random characters; preserve the existing value>
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth web client secret>
FACEBOOK_CLIENT_ID=<Meta app ID>
FACEBOOK_CLIENT_SECRET=<Meta app secret>
FACEBOOK_GRAPH_VERSION=v27.0
APPLE_CLIENT_ID=<Apple Services ID>
APPLE_TEAM_ID=<Apple Developer team ID>
APPLE_KEY_ID=<Sign in with Apple key ID>
APPLE_PRIVATE_KEY=<contents of the private .p8 key>
```

`APPLE_PRIVATE_KEY` accepts real newlines or literal `\n` separators. Use a
production secret store for all secrets/private keys. No provider variable needs
a `NEXT_PUBLIC_` prefix. For Cloudflare, add secret values as Worker secrets and
non-secret values as Worker variables. Do not replace existing secrets with the
example placeholders.

Register these exact callback URLs:

| Provider | Callback |
| --- | --- |
| Google | `https://onceupontoday.site/api/auth/google/callback` |
| Facebook | `https://onceupontoday.site/api/auth/facebook/callback` |
| Apple | `https://onceupontoday.site/api/auth/apple/callback` |

Google: create/configure an OAuth web client and publish the consent screen for
public use. Facebook: enable Facebook Login for web, set the valid OAuth redirect
URI, request `email` and `public_profile`, and complete Meta's required app/public
access configuration. Apple: enable Sign in with Apple on an App ID, associate
the Services ID with it, register `onceupontoday.site` and the return URL, and
create the corresponding Sign in with Apple private key. Apple web login needs
HTTPS and its configured production domain; plain localhost is unsupported.

A provider button stays disabled until its required server configuration exists.
Configuration presence alone cannot validate credentials with the provider.
Use real provider accounts to smoke-test each enabled provider after deployment.

## Database migration and deployment

For Cloudflare production, apply the additive migration before deploying the new
code:

```sh
npm run db:migrate:cloudflare
```

`0002_social_login.sql` adds nullable, unique Facebook/Apple subject fields to
existing users; it preserves Google accounts, password accounts and content.
Node production applies migrations automatically. Import/backup tools use the
same local migration ledger so repeated runs are safe. Backups include the new
identity fields.

Local development with `CONTENT_API_URL` remains API-only, creates no local
database and sends sign-in to the production website as before. Persistent
accounts and sessions belong to the server, not the API-only content preview.

## Account behavior

Successful login returns to the current localized page, including its filters.
Existing accounts are identified by provider subject, never by a browser-supplied
email. Different providers with the same email are not automatically linked; the
user must sign in with their original method. Facebook users without an available
email are asked to allow email access or use another method. Apple private-relay
addresses are supported. Apple names are saved on first login and retained when
Apple omits the name on later logins.

Facebook/Apple accounts are readers. Google admin access still requires the
existing `ADMIN_GOOGLE_EMAILS` allowlist. OAuth state cookies are signed,
HTTP-only, expire after ten minutes and are cleared on callback. Apple uses
`SameSite=None; Secure` for its cross-site form POST; Google/Facebook use Lax.
Google retains PKCE; Google/Apple ID-token signatures, issuer, audience, expiry
and nonce are checked server-side.

## Validation

```sh
npm run test:social-login
npm run test:social-login:browser
npm run test:i18n
npm run typecheck
npm run build
```

Social tests use temporary SQLite and mocked remote providers, including signed
JWT fixtures. They never contact or modify production accounts/data. Actual
provider consent screens require your real production OAuth apps and credentials.
