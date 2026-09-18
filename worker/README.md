# family-sub on Cloudflare Workers + D1

This is a full port of the Flask app to a single Cloudflare Worker backed by D1
(serverless SQLite). The public contract is unchanged: each family member still
uses the same style of URL, `/subscriptions/<token>/<name>`, and receives plain
text config lines.

## Current deployment

- **URL:** https://family-sub.mahdivakili108.workers.dev
- **D1 database:** `family-sub` (`45e97ebc-97d2-4daf-8e1d-e9d8371e7887`, region WEUR)
- **Cron:** `0 */2 * * *` (upstream subscription refresh)
- Admin username: `admin` (password is the `ADMIN_PASSWORD` secret)

## What changed vs. the Flask app

| Flask | Worker |
|---|---|
| Flask blueprints / Jinja templates | `src/routes/*` + `src/views/*` (server-rendered HTML) |
| `sqlite3` file | D1 binding `DB` |
| `threading.Timer` 2-hour refetch | Cron Trigger `0 */2 * * *` in `wrangler.toml` |
| `urllib.request` | `fetch()` |
| Werkzeug password hashing | PBKDF2-SHA256 via Web Crypto |
| Flask signed session cookie | HMAC-signed session cookie (`src/session.js`) |
| Werkzeug CSRF | per-session CSRF token in the signed cookie |
| `ProxyFix` | Cloudflare edge headers (no config needed) |

The original Python app is left in place; this Worker lives entirely under
`worker/`.

## Prerequisites

- Node 18+ and npm
- A Cloudflare account with Workers + D1 enabled
- Wrangler authenticated: `npx wrangler login`

## Deploy

```bash
cd worker
npm install

# 1. Create the database and copy the printed database_id into wrangler.toml
npx wrangler d1 create family-sub

# 2. Apply the schema
npx wrangler d1 execute family-sub --remote --file=./schema.sql

# 3. Set secrets (prompted, never stored in the repo)
npx wrangler secret put SECRET_KEY       # long random string
npx wrangler secret put ADMIN_PASSWORD   # admin login password

# 4. Ship it
npx wrangler deploy
```

Generate a strong secret key with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Open the deployed `https://family-sub.<your-subdomain>.workers.dev` URL and log
in with `ADMIN_USERNAME` (default `admin`) and the `ADMIN_PASSWORD` you set.

### Using an API token instead of `wrangler login`

```powershell
$env:CLOUDFLARE_API_TOKEN = "<token>"
```

The token needs **Workers Scripts: Edit**, **D1: Edit**, and **Account Settings:
Read** (or equivalent) permissions.

## Local development

```bash
npm install
npx wrangler d1 execute family-sub --local --file=./schema.sql
npx wrangler dev
```

`wrangler dev` serves on `http://localhost:3000`. To sign in locally over plain
HTTP, create `worker/.dev.vars` with:

```
SECRET_KEY="dev-secret"
ADMIN_PASSWORD="dev-password"
SESSION_COOKIE_SECURE="0"
```

## Configuration

Set as Worker variables in `wrangler.toml` (`[vars]`) or as secrets:

| Name | Type | Default | Purpose |
|---|---|---|---|
| `APP_ENV` | var | `production` | informational |
| `ADMIN_USERNAME` | var | `admin` | admin login name |
| `ADMIN_PASSWORD` | secret | — | admin password (hashed into D1 on first run) |
| `SECRET_KEY` | secret | — | signs session cookies; rotating it logs everyone out |
| `PBKDF2_ITERATIONS` | var | `100000` | lower to `25000` if free-plan CPU limits reject logins |
| `SESSION_COOKIE_SECURE` | var | `1` | set `0` only for local HTTP dev |

The admin account is created/updated lazily on first request from the
`ADMIN_PASSWORD` secret, matching the Flask startup behavior.

## Tests

```bash
cd worker
npm test
```

Covers the config parser, slug generation, password hashing, session signing,
and the router. D1 queries and full request flows require `wrangler dev` (or
`wrangler dev --remote`) and are not exercised by the unit tests.

## Free-plan notes

- Workers free: 100k requests/day; cron triggers are free.
- D1 free: 5 GB storage, millions of rows read/day.
- Free Workers cap CPU at ~10 ms per request. PBKDF2 runs only on admin login;
  if it is rejected, set `PBKDF2_ITERATIONS` to `25000`.
- Outbound `fetch()` to upstream subscription links leaves from Cloudflare IPs.
  Some providers block cloud ranges, so verify one real link with the
  "Fetch now" button in Sub Links.
