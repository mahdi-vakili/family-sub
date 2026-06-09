import os
from pathlib import Path


def load_config():
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"
    app_env = os.environ.get("APP_ENV", "development").strip().lower() or "development"

    return {
        "APP_ENV": app_env,
        "SECRET_KEY": os.environ.get("SECRET_KEY", "dev-secret-change-me"),
        "DATABASE_PATH": os.environ.get(
            "DATABASE_PATH",
            str(data_dir / "app.db"),
        ),
        "ADMIN_USERNAME": os.environ.get("ADMIN_USERNAME", "admin"),
        "ADMIN_PASSWORD": os.environ.get("ADMIN_PASSWORD", "change-me-now"),
        "MAX_CONTENT_LENGTH": read_int("MAX_CONTENT_LENGTH", 1024 * 1024),
        "TRUST_PROXY_COUNT": read_int("TRUST_PROXY_COUNT", 0),
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "SESSION_COOKIE_SECURE": read_bool(
            "SESSION_COOKIE_SECURE",
            app_env == "production",
        ),
        "PREFERRED_URL_SCHEME": "https" if app_env == "production" else "http",
    }


def validate_config(config):
    if config.get("APP_ENV") != "production":
        return

    errors = []
    if config.get("SECRET_KEY") == "dev-secret-change-me":
        errors.append("SECRET_KEY must be set in production.")
    if config.get("ADMIN_PASSWORD") == "change-me-now":
        errors.append("ADMIN_PASSWORD must be set in production.")

    if errors:
        raise RuntimeError(" ".join(errors))


def read_bool(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def read_int(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return int(value)
