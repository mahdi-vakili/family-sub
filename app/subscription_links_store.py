from app.db import get_db


def list_subscription_links():
    db = get_db()
    return db.execute(
        """
        SELECT id, name, url, last_fetched_at, last_error, created_at
        FROM subscription_links
        ORDER BY id DESC
        """
    ).fetchall()


def get_subscription_link(link_id):
    db = get_db()
    return db.execute(
        """
        SELECT id, name, url, last_fetched_at, last_error, created_at
        FROM subscription_links
        WHERE id = ?
        """,
        (link_id,),
    ).fetchone()


def create_subscription_link(name, url):
    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO subscription_links (name, url)
        VALUES (?, ?)
        """,
        (name, url),
    )
    db.commit()
    return get_subscription_link(cursor.lastrowid)


def delete_subscription_link(link_id):
    db = get_db()
    result = db.execute(
        "DELETE FROM subscription_links WHERE id = ?",
        (link_id,),
    )
    db.commit()
    return result.rowcount


def update_subscription_link_status(link_id, last_fetched_at, last_error):
    db = get_db()
    db.execute(
        """
        UPDATE subscription_links
        SET last_fetched_at = ?, last_error = ?
        WHERE id = ?
        """,
        (last_fetched_at, last_error, link_id),
    )
    db.commit()


def replace_subscription_link_configs(link_id, raw_configs, fetched_at):
    db = get_db()
    db.execute(
        "DELETE FROM subscription_link_configs WHERE subscription_link_id = ?",
        (link_id,),
    )
    if raw_configs:
        db.executemany(
            """
            INSERT INTO subscription_link_configs (subscription_link_id, raw_config, fetched_at)
            VALUES (?, ?, ?)
            """,
            [(link_id, rc, fetched_at) for rc in raw_configs],
        )
    db.commit()


def list_all_subscription_link_configs():
    db = get_db()
    return db.execute(
        """
        SELECT raw_config
        FROM subscription_link_configs
        ORDER BY id ASC
        """
    ).fetchall()
