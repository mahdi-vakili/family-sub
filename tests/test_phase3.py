from app.db import get_db
from app.users_store import list_subscription_users
from tests.conftest import extract_csrf_token, login_admin


def test_creating_users_generates_unique_tokens(client, app):
    login_admin(client)

    first_user_id = create_user(client, "Alice")
    second_user_id = create_user(client, "Bob")

    with app.app_context():
        users = list_subscription_users()

    assert {user["id"] for user in users} == {first_user_id, second_user_id}
    assert len({user["token"] for user in users}) == 2


def test_subscription_url_returns_plain_text_only(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    response = client.get(f"/subscriptions/{token}")

    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert response.text == "vless://one"


def test_subscription_output_includes_active_configs_by_default(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    response = client.get(f"/subscriptions/{token}")

    assert response.status_code == 200
    assert response.text.splitlines() == ["vless://one", "vmess://two"]


def test_soft_deleted_configs_are_excluded_from_subscription_output(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")
    delete_config(client, 1)
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    response = client.get(f"/subscriptions/{token}")

    assert response.status_code == 200
    assert response.text.splitlines() == ["vmess://two"]


def test_user_specific_exclusions_only_affect_that_user(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two\ntrojan://three")
    first_user_id = create_user(client, "Alice")
    second_user_id = create_user(client, "Bob")

    update_user_settings(
        client,
        first_user_id,
        name="Alice",
        excluded_config_ids=[2],
        is_active=True,
    )

    first_token = get_user_token(app, first_user_id)
    second_token = get_user_token(app, second_user_id)
    first_response = client.get(f"/subscriptions/{first_token}")
    second_response = client.get(f"/subscriptions/{second_token}")

    assert first_response.text.splitlines() == ["vless://one", "trojan://three"]
    assert second_response.text.splitlines() == [
        "vless://one",
        "vmess://two",
        "trojan://three",
    ]


def test_subscription_request_logs_once_per_request(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    assert count_subscription_logs(app, user_id) == 0

    first_response = client.get(f"/subscriptions/{token}")
    second_response = client.get(f"/subscriptions/{token}")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert count_subscription_logs(app, user_id) == 2


def test_unknown_or_revoked_tokens_do_not_expose_configs(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    unknown_response = client.get("/subscriptions/not-a-real-token")

    update_user_settings(
        client,
        user_id,
        name="Alice",
        excluded_config_ids=[],
        is_active=False,
    )
    revoked_response = client.get(f"/subscriptions/{token}")

    assert unknown_response.status_code == 404
    assert "vless://one" not in unknown_response.text
    assert revoked_response.status_code == 404
    assert "vless://one" not in revoked_response.text


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

    assert response.status_code == 302
    return int(response.headers["Location"].rstrip("/").split("/")[-1])


def update_user_settings(client, user_id, name, excluded_config_ids, is_active):
    page = client.get(f"/admin/users/{user_id}")
    csrf_token = extract_csrf_token(page.text)
    data = {
        "csrf_token": csrf_token,
        "name": name,
        "excluded_config_ids": [str(config_id) for config_id in excluded_config_ids],
    }
    if is_active:
        data["is_active"] = "1"

    return client.post(
        f"/admin/users/{user_id}",
        data=data,
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


def get_user_token(app, user_id):
    with app.app_context():
        users = list_subscription_users()

    for user in users:
        if user["id"] == user_id:
            return user["token"]

    raise AssertionError(f"User {user_id} was not created.")


def count_subscription_logs(app, user_id):
    with app.app_context():
        row = get_db().execute(
            """
            SELECT COUNT(*)
            FROM subscription_access_logs
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

    return row[0]
