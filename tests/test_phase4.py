from tests.conftest import extract_csrf_token, login_admin


def test_export_all_includes_active_and_soft_deleted_configs(client):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")
    delete_config(client, 2)

    response = client.get("/admin/configs/export/all")

    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert response.headers["Content-Disposition"] == (
        'attachment; filename="configs-all.txt"'
    )
    assert response.text.splitlines() == ["vless://one", "vmess://two"]


def test_export_enabled_includes_only_active_configs(client):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two\ntrojan://three")
    delete_config(client, 2)

    response = client.get("/admin/configs/export/enabled")

    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert response.headers["Content-Disposition"] == (
        'attachment; filename="configs-enabled.txt"'
    )
    assert response.text.splitlines() == ["vless://one", "trojan://three"]


def test_logs_page_shows_subscription_access_user_and_timestamp(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    client.get(f"/subscriptions/{token}")
    response = client.get("/admin/logs")

    assert response.status_code == 200
    assert b"Subscription Access" in response.data
    assert b"Alice" in response.data
    assert b"Timestamp" in response.data


def test_admin_login_attempts_are_recorded_with_result_and_visible(client, app):
    failed_login(client)
    success_response = login_admin(client)

    assert success_response.status_code == 302

    response = client.get("/admin/logs")

    assert response.status_code == 200
    assert b"Admin Login Activity" in response.data
    assert b"Failed" in response.data
    assert b"Success" in response.data
    assert b"admin" in response.data
    assert count_admin_login_logs(app) == 2


def test_admin_navigation_reaches_major_screens(client):
    login_admin(client)

    dashboard = client.get("/admin")
    configs = client.get("/admin/configs")
    users = client.get("/admin/users")
    logs = client.get("/admin/logs")

    assert dashboard.status_code == 200
    assert configs.status_code == 200
    assert users.status_code == 200
    assert logs.status_code == 200
    assert b"Logs" in dashboard.data
    assert b"Export Enabled" in configs.data


def import_configs(client, config_blob):
    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    return client.post(
        "/admin/configs/import",
        data={"csrf_token": csrf_token, "config_blob": config_blob},
        follow_redirects=True,
    )


def delete_config(client, config_id):
    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    return client.post(
        f"/admin/configs/{config_id}/delete",
        data={"csrf_token": csrf_token},
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

    assert response.status_code == 302
    return int(response.headers["Location"].rstrip("/").split("/")[-1])


def failed_login(client):
    login_page = client.get("/admin/login")
    csrf_token = extract_csrf_token(login_page.text)
    return client.post(
        "/admin/login",
        data={
            "username": "admin",
            "password": "wrong-password",
            "csrf_token": csrf_token,
        },
    )


def get_user_token(app, user_id):
    from app.users_store import list_subscription_users

    with app.app_context():
        users = list_subscription_users()

    for user in users:
        if user["id"] == user_id:
            return user["token"]

    raise AssertionError(f"User {user_id} was not created.")


def count_admin_login_logs(app):
    from app.db import get_db

    with app.app_context():
        row = get_db().execute(
            """
            SELECT COUNT(*)
            FROM admin_login_logs
            """
        ).fetchone()

    return row[0]
