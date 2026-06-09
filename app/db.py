import sqlite3
from pathlib import Path

from flask import current_app, g
from werkzeug.security import check_password_hash, generate_password_hash


def get_db():
    if "db" not in g:
        database_path = Path(current_app.config["DATABASE_PATH"])
        database_path.parent.mkdir(parents=True, exist_ok=True)

        g.db = sqlite3.connect(database_path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    schema_path = Path(__file__).with_name("schema.sql")
    db.executescript(schema_path.read_text(encoding="utf-8"))
    db.commit()


def ensure_admin_account(username, password):
    db = get_db()
    admin = get_admin_by_username(username)
    password_hash = generate_password_hash(password)

    if admin is None:
        db.execute(
            """
            INSERT INTO admin_users (username, password_hash)
            VALUES (?, ?)
            """,
            (username, password_hash),
        )
    elif not check_password_hash(admin["password_hash"], password):
        db.execute(
            """
            UPDATE admin_users
            SET password_hash = ?
            WHERE id = ?
            """,
            (password_hash, admin["id"]),
        )

    db.commit()


def get_admin_by_username(username):
    db = get_db()
    return db.execute(
        """
        SELECT id, username, password_hash
        FROM admin_users
        WHERE username = ?
        """,
        (username,),
    ).fetchone()


def record_admin_login_attempt(username, succeeded):
    db = get_db()
    db.execute(
        """
        INSERT INTO admin_login_logs (username, succeeded)
        VALUES (?, ?)
        """,
        (username, int(succeeded)),
    )
    db.commit()


def list_configs(include_deleted=True):
    db = get_db()
    query = """
        SELECT id, raw_config, is_deleted, created_at, deleted_at
        FROM configs
    """
    params = ()

    if not include_deleted:
        query += " WHERE is_deleted = 0"

    query += " ORDER BY is_deleted ASC, id DESC"
    return db.execute(query, params).fetchall()


def import_configs(config_lines):
    db = get_db()
    stats = {"inserted": 0, "restored": 0, "duplicates": 0}

    for config_line in config_lines:
        existing = db.execute(
            """
            SELECT id, is_deleted
            FROM configs
            WHERE raw_config = ?
            """,
            (config_line,),
        ).fetchone()

        if existing is None:
            db.execute(
                """
                INSERT INTO configs (raw_config)
                VALUES (?)
                """,
                (config_line,),
            )
            stats["inserted"] += 1
            continue

        if existing["is_deleted"]:
            db.execute(
                """
                UPDATE configs
                SET is_deleted = 0,
                    deleted_at = NULL
                WHERE id = ?
                """,
                (existing["id"],),
            )
            stats["restored"] += 1
            continue

        stats["duplicates"] += 1

    db.commit()
    return stats


def soft_delete_configs(config_ids):
    if not config_ids:
        return 0

    db = get_db()
    placeholders = ", ".join("?" for _ in config_ids)
    result = db.execute(
        f"""
        UPDATE configs
        SET is_deleted = 1,
            deleted_at = CURRENT_TIMESTAMP
        WHERE id IN ({placeholders})
          AND is_deleted = 0
        """,
        tuple(config_ids),
    )
    db.commit()
    return result.rowcount


def list_config_export_rows(include_deleted):
    db = get_db()
    query = """
        SELECT raw_config
        FROM configs
    """

    if not include_deleted:
        query += " WHERE is_deleted = 0"

    query += " ORDER BY id ASC"
    return db.execute(query).fetchall()
