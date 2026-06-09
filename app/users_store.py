import secrets
import sqlite3

from app.db import get_db

TOKEN_BYTES = 32
TOKEN_ATTEMPTS = 5


def list_subscription_users():
    db = get_db()
    return db.execute(
        """
        SELECT id, name, token, is_active, created_at
        FROM subscription_users
        ORDER BY id DESC
        """
    ).fetchall()


def create_subscription_user(name):
    db = get_db()

    for _ in range(TOKEN_ATTEMPTS):
        token = secrets.token_urlsafe(TOKEN_BYTES)
        try:
            cursor = db.execute(
                """
                INSERT INTO subscription_users (name, token)
                VALUES (?, ?)
                """,
                (name, token),
            )
        except sqlite3.IntegrityError:
            continue

        db.commit()
        return get_subscription_user(cursor.lastrowid)

    raise RuntimeError("Could not generate a unique subscription token.")


def get_subscription_user(user_id):
    db = get_db()
    return db.execute(
        """
        SELECT id, name, token, is_active, created_at
        FROM subscription_users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()


def get_active_subscription_user_by_token(token):
    db = get_db()
    return db.execute(
        """
        SELECT id, name, token, is_active, created_at
        FROM subscription_users
        WHERE token = ?
          AND is_active = 1
        """,
        (token,),
    ).fetchone()


def update_subscription_user(user_id, name, is_active):
    db = get_db()
    result = db.execute(
        """
        UPDATE subscription_users
        SET name = ?,
            is_active = ?
        WHERE id = ?
        """,
        (name, int(is_active), user_id),
    )
    db.commit()

    if result.rowcount == 0:
        return None
    return get_subscription_user(user_id)


def list_active_configs():
    db = get_db()
    return db.execute(
        """
        SELECT id, raw_config
        FROM configs
        WHERE is_deleted = 0
        ORDER BY id DESC
        """
    ).fetchall()


def list_user_excluded_config_ids(user_id):
    db = get_db()
    rows = db.execute(
        """
        SELECT config_id
        FROM user_config_exclusions
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchall()
    return {row["config_id"] for row in rows}


def replace_user_exclusions(user_id, config_ids):
    db = get_db()
    db.execute(
        """
        DELETE FROM user_config_exclusions
        WHERE user_id = ?
        """,
        (user_id,),
    )

    if config_ids:
        db.executemany(
            """
            INSERT INTO user_config_exclusions (user_id, config_id)
            VALUES (?, ?)
            """,
            [(user_id, config_id) for config_id in config_ids],
        )

    db.commit()


def list_subscription_configs_for_user(user_id):
    db = get_db()
    return db.execute(
        """
        SELECT c.raw_config
        FROM configs AS c
        WHERE c.is_deleted = 0
          AND NOT EXISTS (
              SELECT 1
              FROM user_config_exclusions AS e
              WHERE e.user_id = ?
                AND e.config_id = c.id
          )
        ORDER BY c.id ASC
        """,
        (user_id,),
    ).fetchall()


def record_subscription_access(user_id):
    db = get_db()
    db.execute(
        """
        INSERT INTO subscription_access_logs (user_id)
        VALUES (?)
        """,
        (user_id,),
    )
    db.commit()
