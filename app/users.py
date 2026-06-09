from flask import (
    Blueprint,
    Response,
    abort,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)

from app.auth import admin_required
from app.security import validate_csrf_token
from app.subscription_urls import build_subscription_slug
from app.users_store import (
    create_subscription_user,
    delete_subscription_user,
    get_active_subscription_user_by_token,
    get_subscription_user,
    list_active_configs,
    list_subscription_configs_for_user,
    list_subscription_users,
    list_user_excluded_config_ids,
    record_subscription_access,
    replace_user_exclusions,
    update_subscription_user,
)

users_bp = Blueprint("users", __name__)
MAX_USER_NAME_LENGTH = 100


@users_bp.get("/admin/users")
@admin_required
def user_index():
    users = [serialize_user(user) for user in list_subscription_users()]
    return render_template("users.html", users=users)


@users_bp.post("/admin/users")
@admin_required
def create_user():
    validate_csrf_token(request.form.get("csrf_token", ""))

    name, error = validate_user_name(request.form.get("name", ""))
    if error:
        flash(error, "error")
        return redirect(url_for("users.user_index"))

    user = create_subscription_user(name)
    flash(f'Created subscription user "{user["name"]}".', "success")
    return redirect(url_for("users.edit_user", user_id=user["id"]))


@users_bp.get("/admin/users/<int:user_id>")
@admin_required
def edit_user(user_id):
    user = serialize_user(get_subscription_user_or_404(user_id))
    active_configs = list_active_configs()
    excluded_config_ids = list_user_excluded_config_ids(user_id)
    return render_template(
        "user_edit.html",
        user=user,
        active_configs=active_configs,
        excluded_config_ids=excluded_config_ids,
    )


@users_bp.post("/admin/users/<int:user_id>")
@admin_required
def update_user(user_id):
    validate_csrf_token(request.form.get("csrf_token", ""))
    get_subscription_user_or_404(user_id)

    name, error = validate_user_name(request.form.get("name", ""))
    if error:
        flash(error, "error")
        return redirect(url_for("users.edit_user", user_id=user_id))

    active_configs = list_active_configs()
    allowed_config_ids = {config["id"] for config in active_configs}
    excluded_config_ids = parse_config_ids(
        request.form.getlist("excluded_config_ids"),
        allowed_config_ids,
    )

    update_subscription_user(
        user_id=user_id,
        name=name,
        is_active=request.form.get("is_active") == "1",
    )
    replace_user_exclusions(user_id, excluded_config_ids)

    flash("User settings saved.", "success")
    return redirect(url_for("users.edit_user", user_id=user_id))


@users_bp.post("/admin/users/<int:user_id>/delete")
@admin_required
def delete_user(user_id):
    validate_csrf_token(request.form.get("csrf_token", ""))
    user = get_subscription_user_or_404(user_id)
    deleted_count = delete_subscription_user(user_id)
    if deleted_count:
        flash(f'Deleted subscription user "{user["name"]}".', "success")
    return redirect(url_for("users.user_index"))


@users_bp.get("/subscriptions/<token>")
@users_bp.get("/subscriptions/<token>/<user_slug>")
def subscription_feed(token, user_slug=None):
    user = get_active_subscription_user_by_token(token)
    if user is None:
        return Response("Not found\n", status=404, mimetype="text/plain")

    configs = list_subscription_configs_for_user(user["id"])
    record_subscription_access(user["id"])
    body = "\n".join(config["raw_config"] for config in configs)
    return Response(body, mimetype="text/plain")


def get_subscription_user_or_404(user_id):
    user = get_subscription_user(user_id)
    if user is None:
        abort(404)
    return user


def serialize_user(user):
    data = dict(user)
    data["subscription_slug"] = build_subscription_slug(user["name"])
    return data


def validate_user_name(raw_name):
    name = raw_name.strip()
    if not name:
        return "", "User name is required."
    if len(name) > MAX_USER_NAME_LENGTH:
        return "", f"User name must be {MAX_USER_NAME_LENGTH} characters or fewer."
    return name, ""


def parse_config_ids(raw_ids, allowed_ids):
    parsed = []
    seen = set()

    for raw_id in raw_ids:
        try:
            config_id = int(raw_id)
        except (TypeError, ValueError):
            continue

        if config_id not in allowed_ids or config_id in seen:
            continue

        seen.add(config_id)
        parsed.append(config_id)

    return parsed
