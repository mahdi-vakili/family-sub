from app.config_parser import extract_config_lines
from app.db import list_configs
from tests.conftest import extract_csrf_token, login_admin


def test_parser_extracts_valid_config_lines_from_mixed_text():
    blob = """
    some intro text
    vless://alpha@example.com:443?security=tls#first
    random note
    trojan://secret@example.org:443#second
    """

    lines = extract_config_lines(blob)

    assert lines == [
        "vless://alpha@example.com:443?security=tls#first",
        "trojan://secret@example.org:443#second",
    ]


def test_parser_accepts_multiple_protocols():
    blob = """
    vless://one
    vmess://two
    trojan://three
    ss://four
    hysteria2://five
    """

    lines = extract_config_lines(blob)

    assert lines == [
        "vless://one",
        "vmess://two",
        "trojan://three",
        "ss://four",
        "hysteria2://five",
    ]


def test_import_skips_duplicates(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvless://one\nvmess://two")

    with app.app_context():
        configs = list_configs()

    assert [config["raw_config"] for config in configs] == ["vmess://two", "vless://one"]


def test_soft_deleted_configs_remain_in_database(client, app):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")

    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    response = client.post(
        "/admin/configs/1/delete",
        data={"csrf_token": csrf_token},
        follow_redirects=True,
    )

    assert response.status_code == 200

    with app.app_context():
        configs = list_configs(include_deleted=True)
        active_configs = list_configs(include_deleted=False)

    assert len(configs) == 2
    assert len(active_configs) == 1
    assert configs[1]["is_deleted"] == 1


def test_single_delete_works(client):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")

    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    response = client.post(
        "/admin/configs/1/delete",
        data={"csrf_token": csrf_token},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Soft-deleted 1 config(s)." in response.data
    assert b"Deleted" in response.data


def test_batch_delete_works(client):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two\ntrojan://three")

    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    response = client.post(
        "/admin/configs/delete",
        data={"csrf_token": csrf_token, "config_ids": ["1", "2"]},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert b"Soft-deleted 2 config(s)." in response.data


def test_config_list_shows_active_and_deleted_states(client):
    login_admin(client)
    import_configs(client, "vless://one\nvmess://two")

    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    client.post(
        "/admin/configs/1/delete",
        data={"csrf_token": csrf_token},
        follow_redirects=True,
    )

    response = client.get("/admin/configs")

    assert response.status_code == 200
    assert b"Active" in response.data
    assert b"Deleted" in response.data


def import_configs(client, config_blob):
    page = client.get("/admin/configs")
    csrf_token = extract_csrf_token(page.text)
    return client.post(
        "/admin/configs/import",
        data={"csrf_token": csrf_token, "config_blob": config_blob},
        follow_redirects=True,
    )
