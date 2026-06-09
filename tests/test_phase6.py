from pathlib import Path

from app import create_app
from tests.conftest import extract_csrf_token, login_admin


def test_full_admin_workflow_from_zero(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two\ntrojan://three")
    user_id = create_user(client, "Alice")
    update_user(client, user_id, "Alice", [2])

    token = get_user_token(app, user_id)
    subscription = client.get(f"/subscriptions/{token}")
    enabled_export = client.get("/admin/configs/export/enabled")
    all_export = client.get("/admin/configs/export/all")
    logs = client.get("/admin/logs")

    assert subscription.status_code == 200
    assert subscription.text.splitlines() == ["vless://one", "trojan://three"]
    assert enabled_export.text.splitlines() == [
        "vless://one",
        "vmess://two",
        "trojan://three",
    ]
    assert all_export.text == enabled_export.text
    assert logs.status_code == 200
    assert b"Subscription Access" in logs.data
    assert b"Admin Login Activity" in logs.data
    assert b"Alice" in logs.data


def test_login_ignores_external_next_target(client):
    login_page = client.get("/admin/login?next=https://evil.example/path")
    csrf_token = extract_csrf_token(login_page.text)
    response = client.post(
        "/admin/login?next=https://evil.example/path",
        data={
            "username": "admin",
            "password": "test-password",
            "csrf_token": csrf_token,
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/admin")


def test_common_errors_render_app_pages(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "DATABASE_PATH": str(Path(tmp_path) / "phase6.db"),
            "ADMIN_USERNAME": "admin",
            "ADMIN_PASSWORD": "test-password",
            "MAX_CONTENT_LENGTH": 20,
        }
    )
    client = app.test_client()

    missing_page = client.get("/does-not-exist")
    bad_request = client.post("/admin/login", data={"csrf_token": "bad"})
    too_large = client.post("/admin/login", data={"payload": "x" * 200})

    assert missing_page.status_code == 404
    assert b"Page Not Found" in missing_page.data
    assert bad_request.status_code == 400
    assert b"Bad Request" in bad_request.data
    assert too_large.status_code == 413
    assert b"Request Too Large" in too_large.data


def import_configs(client, config_blob):
    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    return client.post(
        "/admin/configs/import",
        data={"csrf_token": csrf_token, "config_blob": config_blob},
        follow_redirects=True,
    )


def create_user(client, name):
    page = client.get("/admin/users")
    csrf_token = extract_csrf_token(page.text)
    response = client.post(
        "/admin/users",
        data={"csrf_token": csrf_token, "name": name},
        follow_redirects=False,
    )
    return int(response.headers["Location"].rstrip("/").split("/")[-1])


def update_user(client, user_id, name, excluded_config_ids):
    page = client.get(f"/admin/users/{user_id}")
    csrf_token = extract_csrf_token(page.text)
    return client.post(
        f"/admin/users/{user_id}",
        data={
            "csrf_token": csrf_token,
            "name": name,
            "is_active": "1",
            "excluded_config_ids": [str(config_id) for config_id in excluded_config_ids],
        },
        follow_redirects=True,
    )


def get_user_token(app, user_id):
    from app.users_store import list_subscription_users

    with app.app_context():
        users = list_subscription_users()

    for user in users:
        if user["id"] == user_id:
            return user["token"]

    raise AssertionError(f"User {user_id} was not created.")
