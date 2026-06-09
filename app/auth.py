from functools import wraps
from urllib.parse import urlsplit

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for

from app.db import get_admin_by_username, record_admin_login_attempt
from app.security import validate_csrf_token, verify_password

auth_bp = Blueprint("auth", __name__)


@auth_bp.before_app_request
def load_logged_in_admin():
    admin_id = session.get("admin_user_id")
    admin_username = session.get("admin_username")
    g.admin_user_id = admin_id
    g.admin_username = admin_username


def admin_required(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if g.admin_user_id is None:
            return redirect(url_for("auth.login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapped_view


@auth_bp.get("/")
def home():
    if g.admin_user_id is not None:
        return redirect(url_for("auth.dashboard"))
    return redirect(url_for("auth.login"))


@auth_bp.route("/admin/login", methods=["GET", "POST"])
def login():
    if g.admin_user_id is not None:
        return redirect(url_for("auth.dashboard"))

    if request.method == "POST":
        return handle_login_submission()
    return render_template("login.html")


@auth_bp.get("/admin")
@admin_required
def dashboard():
    return render_template("dashboard.html")


@auth_bp.post("/admin/logout")
@admin_required
def logout():
    validate_csrf_token(request.form.get("csrf_token", ""))
    session.clear()
    return redirect(url_for("auth.login"))


def handle_login_submission():
    validate_csrf_token(request.form.get("csrf_token", ""))

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    admin = get_admin_by_username(username)
    is_valid = admin is not None and verify_password(admin["password_hash"], password)

    record_admin_login_attempt(username=username, succeeded=is_valid)

    if not is_valid:
        flash("Invalid username or password.", "error")
        return render_template("login.html"), 401

    session.clear()
    session["admin_user_id"] = admin["id"]
    session["admin_username"] = admin["username"]

    return redirect(resolve_next_url(request.args.get("next")))


def resolve_next_url(next_url):
    if not next_url:
        return url_for("auth.dashboard")

    parsed = urlsplit(next_url)
    if parsed.scheme or parsed.netloc or not next_url.startswith("/"):
        return url_for("auth.dashboard")

    return next_url
