import sqlite3

from tests.conftest import extract_csrf_token, login_admin


def test_database_file_is_created(database_path, app):
    assert database_path.exists()

    connection = sqlite3.connect(database_path)
    try:
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
    finally:
        connection.close()

    expected_tables = {
        "admin_users",
        "configs",
        "subscription_users",
        "user_config_exclusions",
        "subscription_access_logs",
        "admin_login_logs",
    }
    assert expected_tables.issubset(tables)


def test_login_page_loads(client):
    response = client.get("/admin/login")
    assert response.status_code == 200
    assert b"Admin Login" in response.data


def test_protected_route_redirects_to_login(client):
    response = client.get("/admin")
    assert response.status_code == 302
    assert "/admin/login" in response.headers["Location"]


def test_admin_login_works_with_valid_credentials(client):
    response = login_admin(client)

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/admin")

    dashboard = client.get("/admin")
    assert dashboard.status_code == 200
    assert b"Admin Dashboard" in dashboard.data


def test_admin_login_fails_with_invalid_credentials(client):
    login_page = client.get("/admin/login")
    csrf_token = extract_csrf_token(login_page.text)

    response = client.post(
        "/admin/login",
        data={
            "username": "admin",
            "password": "wrong-password",
            "csrf_token": csrf_token,
        },
    )

    assert response.status_code == 401
    assert b"Invalid username or password." in response.data


def test_logout_invalidates_session(client):
    login_admin(client)

    dashboard = client.get("/admin")
    logout_token = extract_csrf_token(dashboard.text)
    response = client.post(
        "/admin/logout",
        data={"csrf_token": logout_token},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/admin/login")

    redirected = client.get("/admin")
    assert redirected.status_code == 302
    assert "/admin/login" in redirected.headers["Location"]
