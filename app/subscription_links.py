from flask import Blueprint, flash, redirect, render_template, request, url_for

from app.auth import admin_required
from app.security import validate_csrf_token
from app.subscription_link_fetcher import fetch_subscription_link
from app.subscription_links_store import (
    create_subscription_link,
    delete_subscription_link,
    get_subscription_link,
    list_subscription_links,
)

subscription_links_bp = Blueprint("subscription_links", __name__)

MAX_LINK_NAME_LENGTH = 100
MAX_LINK_URL_LENGTH = 2048


@subscription_links_bp.get("/admin/subscription-links")
@admin_required
def subscription_links_index():
    links = list_subscription_links()
    return render_template("subscription_links.html", links=links)


@subscription_links_bp.post("/admin/subscription-links")
@admin_required
def create_link():
    validate_csrf_token(request.form.get("csrf_token", ""))

    name = request.form.get("name", "").strip()
    url = request.form.get("url", "").strip()

    if not name:
        flash("Link name is required.", "error")
        return redirect(url_for("subscription_links.subscription_links_index"))

    if len(name) > MAX_LINK_NAME_LENGTH:
        flash(f"Link name must be {MAX_LINK_NAME_LENGTH} characters or fewer.", "error")
        return redirect(url_for("subscription_links.subscription_links_index"))

    if not url:
        flash("URL is required.", "error")
        return redirect(url_for("subscription_links.subscription_links_index"))

    if len(url) > MAX_LINK_URL_LENGTH:
        flash(f"URL must be {MAX_LINK_URL_LENGTH} characters or fewer.", "error")
        return redirect(url_for("subscription_links.subscription_links_index"))

    link = create_subscription_link(name, url)
    fetch_subscription_link(link["id"])
    flash(f'Created subscription link "{name}". Configs fetched.', "success")
    return redirect(url_for("subscription_links.subscription_links_index"))


@subscription_links_bp.post("/admin/subscription-links/<int:link_id>/delete")
@admin_required
def delete_link(link_id):
    validate_csrf_token(request.form.get("csrf_token", ""))
    deleted_count = delete_subscription_link(link_id)
    if deleted_count:
        flash("Subscription link deleted.", "success")
    return redirect(url_for("subscription_links.subscription_links_index"))


@subscription_links_bp.post("/admin/subscription-links/<int:link_id>/fetch")
@admin_required
def fetch_link(link_id):
    validate_csrf_token(request.form.get("csrf_token", ""))
    link = get_subscription_link(link_id)
    if link is None:
        flash("Subscription link not found.", "error")
        return redirect(url_for("subscription_links.subscription_links_index"))
    fetch_subscription_link(link_id)
    flash(f'Fetched configs from "{link["name"]}".', "success")
    return redirect(url_for("subscription_links.subscription_links_index"))
