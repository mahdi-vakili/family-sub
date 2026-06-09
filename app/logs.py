from flask import Blueprint, render_template

from app.auth import admin_required
from app.logs_store import list_admin_login_logs, list_subscription_access_logs

logs_bp = Blueprint("logs", __name__)


@logs_bp.get("/admin/logs")
@admin_required
def log_index():
    return render_template(
        "logs.html",
        subscription_logs=list_subscription_access_logs(),
        admin_login_logs=list_admin_login_logs(),
    )
