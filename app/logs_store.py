from app.db import get_db


def list_subscription_access_logs():
    db = get_db()
    return db.execute(
        """
        SELECT l.id, u.name AS user_name, l.accessed_at
        FROM subscription_access_logs AS l
        JOIN subscription_users AS u
          ON u.id = l.user_id
        ORDER BY l.id DESC
        """
    ).fetchall()


def list_admin_login_logs():
    db = get_db()
    return db.execute(
        """
        SELECT id, username, succeeded, created_at
        FROM admin_login_logs
        ORDER BY id DESC
        """
    ).fetchall()
