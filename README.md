# family-sub

Small self-hosted subscription service for family use. Admins manage configs and users in a Flask UI, and each user gets a private plain-text subscription URL.

## Features

- SQLite-backed config and user management
- Per-user subscription tokens
- Per-user config exclusions
- Soft delete and export actions
- Subscription access logs and admin login logs
- Docker Compose deployment on Ubuntu behind HTTPS

## Environment Variables

- `APP_ENV`: `development` or `production`. Production enables HTTPS-friendly defaults.
- `SECRET_KEY`: required in production. Used for session and CSRF protection.
- `ADMIN_USERNAME`: admin login name. Defaults to `admin`.
- `ADMIN_PASSWORD`: required in production. Stored as a hash in the database.
- `DATABASE_PATH`: SQLite path. In Docker Compose it is fixed to `/app/data/app.db`.
- `TRUST_PROXY_COUNT`: set to `1` when running behind one reverse proxy such as Nginx.
- `SESSION_COOKIE_SECURE`: keep this at `1` behind HTTPS.
- `MAX_CONTENT_LENGTH`: optional request size limit in bytes. Default is `1048576`.

## Local Run

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python wsgi.py
```

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1`.

## Testing

Run the test suite with:

```bash
python -m pytest -q
```

The tests cover parsing, auth guards, user-specific exclusions, exports, logs, production config checks, and the end-to-end admin workflow.

## Docker Compose

1. Copy `.env.example` to `.env`.
2. Set `SECRET_KEY` and `ADMIN_PASSWORD` to real values.
3. Start the app:

```bash
docker compose up -d --build
```

The app listens on `http://127.0.0.1:8000` and stores persistent data in `./data`.

## Production Startup Command

The container runs this command:

```bash
gunicorn --bind 0.0.0.0:8000 --workers 2 wsgi:app
```

## Ubuntu HTTPS Deployment

1. Install Docker Engine and Docker Compose plugin.
2. Clone the repo on the server.
3. Create `.env` from `.env.example`.
4. Run `docker compose up -d --build`.
5. Put Nginx in front of the container and terminate TLS there.

Example Nginx site:

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

Then issue a certificate with Certbot, for example:

```bash
sudo certbot --nginx -d sub.example.com
```

## Notes

- `APP_ENV=production` refuses to start with the default `SECRET_KEY` or default admin password.
- `./data` must remain writable so SQLite persists across container restarts.
