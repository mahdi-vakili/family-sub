from pathlib import Path

import pytest
from werkzeug.middleware.proxy_fix import ProxyFix

from app import create_app
from app.config import load_config, validate_config


def clear_phase5_env(monkeypatch):
    for name in [
        "APP_ENV",
        "SECRET_KEY",
        "DATABASE_PATH",
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD",
        "MAX_CONTENT_LENGTH",
        "TRUST_PROXY_COUNT",
        "SESSION_COOKIE_SECURE",
    ]:
        monkeypatch.delenv(name, raising=False)


def test_environment_variables_override_defaults(monkeypatch):
    clear_phase5_env(monkeypatch)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "prod-secret")
    monkeypatch.setenv("DATABASE_PATH", "/tmp/family-sub.db")
    monkeypatch.setenv("ADMIN_USERNAME", "owner")
    monkeypatch.setenv("ADMIN_PASSWORD", "prod-password")
    monkeypatch.setenv("MAX_CONTENT_LENGTH", "2048")
    monkeypatch.setenv("TRUST_PROXY_COUNT", "1")

    config = load_config()

    assert config["APP_ENV"] == "production"
    assert config["SECRET_KEY"] == "prod-secret"
    assert config["DATABASE_PATH"] == "/tmp/family-sub.db"
    assert config["ADMIN_USERNAME"] == "owner"
    assert config["ADMIN_PASSWORD"] == "prod-password"
    assert config["MAX_CONTENT_LENGTH"] == 2048
    assert config["TRUST_PROXY_COUNT"] == 1
    assert config["SESSION_COOKIE_SECURE"] is True
    assert config["PREFERRED_URL_SCHEME"] == "https"


def test_production_mode_rejects_insecure_defaults(monkeypatch):
    clear_phase5_env(monkeypatch)
    config = load_config()
    config["APP_ENV"] = "production"

    with pytest.raises(RuntimeError):
        validate_config(config)


def test_proxy_fix_is_enabled_for_trusted_proxy(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "APP_ENV": "production",
            "SECRET_KEY": "prod-secret",
            "DATABASE_PATH": str(Path(tmp_path) / "app.db"),
            "ADMIN_PASSWORD": "prod-password",
            "TRUST_PROXY_COUNT": 1,
        }
    )

    assert isinstance(app.wsgi_app, ProxyFix)
