from datetime import date

from flask import Blueprint, render_template, request

from app.auth import admin_required
from app.logs_store import list_admin_login_logs, list_subscription_access_logs
from app.users_store import list_subscription_users

logs_bp = Blueprint("logs", __name__)


@logs_bp.get("/admin/logs")
@admin_required
def log_index():
    subscription_filters = read_subscription_filters()
    admin_filters = read_admin_filters()
    return render_template(
        "logs.html",
        subscription_logs=list_subscription_access_logs(**subscription_filters),
        admin_login_logs=list_admin_login_logs(**admin_filters),
        subscription_users=list_subscription_users(),
        subscription_filters=subscription_filters,
        admin_filters=admin_filters,
    )


def read_subscription_filters():
    return {
        "user_id": parse_int(request.args.get("sub_user_id", "")),
        "date_from": parse_iso_date(request.args.get("sub_date_from", "")),
        "date_to": parse_iso_date(request.args.get("sub_date_to", "")),
    }


def read_admin_filters():
    return {
        "username": request.args.get("admin_username", "").strip(),
        "date_from": parse_iso_date(request.args.get("admin_date_from", "")),
        "date_to": parse_iso_date(request.args.get("admin_date_to", "")),
    }


def parse_int(raw_value):
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def parse_iso_date(raw_value):
    raw_value = raw_value.strip()
    if not raw_value:
        return ""

    try:
        return date.fromisoformat(raw_value).isoformat()
    except ValueError:
        return ""
