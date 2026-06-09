from pathlib import Path

import pytest

from app import create_app


@pytest.fixture
def app(tmp_path):
    database_path = tmp_path / "test.db"
    flask_app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "DATABASE_PATH": str(database_path),
            "ADMIN_USERNAME": "admin",
            "ADMIN_PASSWORD": "test-password",
        }
    )
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def database_path(app):
    return Path(app.config["DATABASE_PATH"])


def extract_csrf_token(html):
    marker = 'name="csrf_token" value="'
    start = html.index(marker) + len(marker)
    end = html.index('"', start)
    return html[start:end]


def login_admin(client, username="admin", password="test-password"):
    login_page = client.get("/admin/login")
    csrf_token = extract_csrf_token(login_page.text)
    return client.post(
        "/admin/login",
        data={
            "username": username,
            "password": password,
            "csrf_token": csrf_token,
        },
        follow_redirects=False,
    )
