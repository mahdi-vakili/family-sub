from tests.conftest import extract_csrf_token, login_admin


def test_logs_can_be_filtered_by_user_and_date(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    alice_id = create_user(client, "Alice")
    bob_id = create_user(client, "Bob")

    alice_token = get_user_token(app, alice_id)
    bob_token = get_user_token(app, bob_id)
    client.get(f"/subscriptions/{alice_token}")
    client.get(f"/subscriptions/{bob_token}")
    set_subscription_log_dates(app, alice_id, "2026-01-15 09:00:00")
    set_subscription_log_dates(app, bob_id, "2026-02-20 09:00:00")

    response = client.get(
        "/admin/logs?sub_user_id="
        f"{alice_id}&sub_date_from=2026-01-01&sub_date_to=2026-01-31"
    )

    assert response.status_code == 200
    assert b'2026-01-15 09:00:00' in response.data
    assert b'2026-02-20 09:00:00' not in response.data
    assert b'<option value="%d" selected>' % alice_id in response.data


def test_configs_page_uses_clickable_checkboxes_and_icon_delete_button(client):
    login_admin(client)
    import_configs(client, "vless://one")

    response = client.get("/admin/configs")

    assert response.status_code == 200
    assert b'checkbox-hit-area' in response.data
    assert b'aria-label="Soft delete config 1"' in response.data


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


def get_user_token(app, user_id):
    from app.users_store import list_subscription_users

    with app.app_context():
        users = list_subscription_users()

    for user in users:
        if user["id"] == user_id:
            return user["token"]

    raise AssertionError(f"User {user_id} was not created.")


def set_subscription_log_dates(app, user_id, timestamp):
    from app.db import get_db

    with app.app_context():
        get_db().execute(
            """
            UPDATE subscription_access_logs
            SET accessed_at = ?
            WHERE user_id = ?
            """,
            (timestamp, user_id),
        )
        get_db().commit()
