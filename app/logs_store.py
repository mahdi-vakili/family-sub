from app.db import get_db


def list_subscription_access_logs(user_id=None, date_from="", date_to=""):
    db = get_db()
    query = """
        SELECT l.id, u.name AS user_name, l.accessed_at
        FROM subscription_access_logs AS l
        JOIN subscription_users AS u
          ON u.id = l.user_id
    """
    filters = []
    params = []

    if user_id is not None:
        filters.append("l.user_id = ?")
        params.append(user_id)
    if date_from:
        filters.append("date(l.accessed_at) >= ?")
        params.append(date_from)
    if date_to:
        filters.append("date(l.accessed_at) <= ?")
        params.append(date_to)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += " ORDER BY l.id DESC"
    return db.execute(query, tuple(params)).fetchall()


def list_admin_login_logs(username="", date_from="", date_to=""):
    db = get_db()
    query = """
        SELECT id, username, succeeded, created_at
        FROM admin_login_logs
    """
    filters = []
    params = []

    if username:
        filters.append("username = ?")
        params.append(username)
    if date_from:
        filters.append("date(created_at) >= ?")
        params.append(date_from)
    if date_to:
        filters.append("date(created_at) <= ?")
        params.append(date_to)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += " ORDER BY id DESC"
    return db.execute(query, tuple(params)).fetchall()
