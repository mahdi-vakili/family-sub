# vpn-sub-manager

A self-hosted subscription manager for distributing VPN/proxy configurations to family members. Manage configs and users through a simple web admin panel, then each family member gets a private URL they can paste into their client app.

## Why This Is Useful

If you manage VPN or proxy configs for your family, you know the pain: sharing configs manually, keeping track of who has what, dealing with revoked access, and having no visibility into who's actually using the service. **vpn-sub-manager** solves all of this:

- **One admin panel, all configs in one place.** Paste a messy text blob containing `vless://`, `trojan://`, `vmess://`, `ss://`, or `hysteria2://` lines -- the parser extracts the valid configs, deduplicates, and ignores the rest.

- **Private subscription URLs per user.** Each family member gets a unique, tokenized URL. They paste it into their VPN client (V2Ray, NekoBox, Streisand, Hiddify, etc.) and it just works. No more sending config strings over WhatsApp.

- **Per-user exclusions.** Want to give Mom access to everything but limit your kid to a single server? Exclude specific configs per user without affecting anyone else.

- **Access logs.** See who fetched their subscription and when. Know immediately if a token is being shared or hasn't been used in months.

- **Self-hosted and minimal.** Single container, SQLite database, no external dependencies. Runs on a $5/month VPS. No data leaves your server.

## Features

- **Protocol-agnostic parsing** -- accepts VLESS, VMess, Trojan, Shadowsocks, Hysteria2, and any URI-style config line
- **Batch import** -- paste a noisy text blob, valid configs are extracted automatically
- **Duplicate prevention** -- same config imported twice won't create duplicates
- **Soft delete** -- hide configs from subscriptions without permanently removing them
- **Per-user config exclusions** -- fine-grained control over what each user sees
- **Plain-text subscription endpoint** -- compatible with standard VPN client subscription import
- **URL slugs** -- human-readable subscription URLs (`/subscriptions/<token>/<name>`)
- **Access logging** -- every subscription fetch is recorded with timestamp
- **Admin login logging** -- track login attempts (success and failure)
- **Export** -- download all configs or only active ones as `.txt` files
- **Docker Compose** -- one-command deployment
- **HTTPS-ready** -- deploy behind Nginx + Certbot

## Quick Start

### Local Development

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows PowerShell
# source .venv/bin/activate   # Linux/macOS

pip install -r requirements.txt
python wsgi.py
```

Open `http://127.0.0.1:8000` -- login with `admin` / the password from your `.env`.

### Docker Compose

```bash
cp .env.example .env          # create your config
# edit .env -- set SECRET_KEY and ADMIN_PASSWORD
docker compose up -d --build
```

The app runs on `http://127.0.0.1:8000`. Data persists in `./data/`.

## How It Works

1. **Admin imports configs** -- paste text containing proxy URIs into the import form. The parser extracts valid lines, strips junk, and stores them.

2. **Admin creates users** -- each user gets a unique tokenized subscription URL.

3. **User imports URL into client** -- the user pastes their subscription URL into V2Ray, NekoBox, Hiddify, Streisand, or any client that supports plain-text subscription feeds.

4. **Client fetches configs** -- the client requests the URL and receives a plain-text list of all active configs (minus any excluded for that user).

5. **Admin monitors activity** -- check the Logs page to see who fetched their subscription and when.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | No | `development` | Set to `production` for HTTPS-safe defaults |
| `SECRET_KEY` | Yes (prod) | -- | Session and CSRF secret. Refuses to start with default in production |
| `ADMIN_USERNAME` | No | `admin` | Admin login username |
| `ADMIN_PASSWORD` | Yes (prod) | -- | Admin password. Stored as hash in database |
| `DATABASE_PATH` | No | `./data/app.db` | SQLite database path |
| `TRUST_PROXY_COUNT` | No | `0` | Set to `1` behind one reverse proxy |
| `SESSION_COOKIE_SECURE` | No | `0` | Set to `1` behind HTTPS |
| `MAX_CONTENT_LENGTH` | No | `1048576` | Max request size in bytes |

## Project Structure

```
vpn-sub-manager/
  app/
    __init__.py          # Flask app factory
    config.py            # Environment config loading
    db.py                # Database layer (SQLite)
    schema.sql           # Database schema
    security.py          # CSRF and password hashing
    auth.py              # Login/logout, session management
    config_parser.py     # URI config line parser
    configs.py           # Config import/delete/export routes
    users.py             # User CRUD and subscription endpoint
    users_store.py       # User data access layer
    subscription_urls.py # URL slug builder
    logs.py              # Access and login log views
    logs_store.py        # Log query helpers
    errors.py            # Error handlers
    templates/           # Jinja2 templates
    static/styles.css    # Stylesheet
  tests/                 # pytest test suite
  wsgi.py                # Application entrypoint
  Dockerfile             # Container build
  docker-compose.yml     # Service orchestration
  requirements.txt       # Python dependencies
```

## Production Deployment (Ubuntu)

1. Install Docker Engine and Docker Compose plugin
2. Clone the repository
3. Create `.env` with a strong `SECRET_KEY` and `ADMIN_PASSWORD`
4. Run `docker compose up -d --build`
5. Put Nginx in front with TLS termination:

```nginx
server {
    server_name sub.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

6. Issue a certificate:

```bash
sudo certbot --nginx -d sub.example.com
```

## Testing

```bash
python -m pytest -q
```

Covers config parsing, authentication, user subscriptions, per-user exclusions, exports, logs, and end-to-end admin workflows.

## License

MIT
