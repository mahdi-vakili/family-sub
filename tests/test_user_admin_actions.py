from app.users_store import list_subscription_users
from tests.conftest import extract_csrf_token, login_admin


def test_users_page_offers_edit_and_delete_actions(client):
    login_admin(client)
    create_user(client, "Alice")

    response = client.get("/admin/users")

    assert response.status_code == 200
    assert b">Edit<" in response.data
    assert b">Delete<" in response.data


def test_deleting_user_removes_member_and_revokes_subscription(client, app):
    login_admin(client)
    user_id = create_user(client, "Alice")
    token = get_user_token(app, user_id)

    page = client.get("/admin/users")
    csrf_token = extract_csrf_token(page.text)
    response = client.post(
        f"/admin/users/{user_id}/delete",
        data={"csrf_token": csrf_token},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Deleted subscription user" in response.data
    assert b"Alice" in response.data
    assert client.get(f"/subscriptions/{token}").status_code == 404

    with app.app_context():
        users = list_subscription_users()

    assert all(user["id"] != user_id for user in users)


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
    with app.app_context():
        users = list_subscription_users()

    for user in users:
        if user["id"] == user_id:
            return user["token"]

    raise AssertionError(f"User {user_id} was not created.")
