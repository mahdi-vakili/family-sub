from flask import Blueprint, flash, redirect, render_template, request, url_for

from app.auth import admin_required
from app.config_parser import extract_config_lines
from app.db import import_configs, list_configs, soft_delete_configs
from app.security import validate_csrf_token

configs_bp = Blueprint("configs", __name__)


@configs_bp.get("/admin/configs")
@admin_required
def config_index():
    configs = list_configs(include_deleted=True)
    return render_template("configs.html", configs=configs)


@configs_bp.post("/admin/configs/import")
@admin_required
def import_config_batch():
    validate_csrf_token(request.form.get("csrf_token", ""))

    config_blob = request.form.get("config_blob", "")
    config_lines = extract_config_lines(config_blob)

    if not config_lines:
        flash("No valid config lines were found in the pasted text.", "error")
        return redirect(url_for("configs.config_index"))

    stats = import_configs(config_lines)
    skipped = stats["duplicates"]
    flash(
        (
            f"Import complete. Added {stats['inserted']}, "
            f"restored {stats['restored']}, skipped {skipped} duplicates."
        ),
        "success",
    )
    return redirect(url_for("configs.config_index"))


@configs_bp.post("/admin/configs/delete")
@admin_required
def batch_delete_configs():
    validate_csrf_token(request.form.get("csrf_token", ""))

    config_ids = parse_config_ids(request.form.getlist("config_ids"))
    if not config_ids:
        flash("Select at least one config to delete.", "error")
        return redirect(url_for("configs.config_index"))

    deleted_count = soft_delete_configs(config_ids)
    flash(f"Soft-deleted {deleted_count} config(s).", "success")
    return redirect(url_for("configs.config_index"))


@configs_bp.post("/admin/configs/<int:config_id>/delete")
@admin_required
def delete_single_config(config_id):
    validate_csrf_token(request.form.get("csrf_token", ""))

    deleted_count = soft_delete_configs([config_id])
    flash(f"Soft-deleted {deleted_count} config(s).", "success")
    return redirect(url_for("configs.config_index"))


def parse_config_ids(raw_ids):
    parsed = []
    for raw_id in raw_ids:
        try:
            parsed.append(int(raw_id))
        except (TypeError, ValueError):
            continue
    return parsed
