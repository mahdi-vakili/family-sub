from tests.conftest import extract_csrf_token, login_admin


def test_generated_subscription_url_includes_user_name_slug(client, app):
    login_admin(client)
    user_id = create_user(client, "Alice Smith")
    token = get_user_token(app, user_id)

    users_page = client.get("/admin/users")
    edit_page = client.get(f"/admin/users/{user_id}")

    expected_path = f"/subscriptions/{token}/alice-smith"
    assert expected_path.encode() in users_page.data
    assert expected_path.encode() in edit_page.data


def test_slugged_subscription_url_returns_plain_text(client, app):
    login_admin(client)
    import_configs(client, "vless://one")
    user_id = create_user(client, "Bahar")
    token = get_user_token(app, user_id)

    response = client.get(f"/subscriptions/{token}/bahar")

    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert response.text == "vless://one"


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
