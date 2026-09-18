import { register } from "../router.js";
import { html, redirect, text } from "../http.js";
import { pushFlash, validateCsrf } from "../context.js";
import { extractConfigLines } from "../parser.js";
import {
  deleteConfigsByRaw,
  hardDeleteConfigs,
  importConfigs,
  listConfigExportRows,
  listConfigs,
} from "../db/index.js";
import { renderConfigsPage } from "../views/configs.js";
import { parseConfigIds, parseIdParam, withAdmin } from "./helpers.js";

register(
  "GET",
  "/admin/configs",
  withAdmin(async (ctx) => html(renderConfigsPage(ctx, await listConfigs(ctx.env)))),
);

register(
  "POST",
  "/admin/configs/import",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const lines = extractConfigLines(form.get("config_blob") || "");
    if (!lines.length) {
      pushFlash(ctx, "error", "No valid config lines were found in the pasted text.");
      return redirect("/admin/configs");
    }
    const stats = await importConfigs(ctx.env, lines);
    pushFlash(
      ctx,
      "success",
      `Import complete. Added ${stats.inserted}, skipped ${stats.duplicates} duplicates.`,
    );
    return redirect("/admin/configs");
  }),
);

register(
  "POST",
  "/admin/configs/delete-by-paste",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const lines = extractConfigLines(form.get("delete_blob") || "", { excludeWebUrls: false });
    if (!lines.length) {
      pushFlash(ctx, "error", "No valid config lines were found in the pasted text.");
      return redirect("/admin/configs");
    }
    const deleted = await deleteConfigsByRaw(ctx.env, lines);
    const notFound = lines.length - deleted;
    pushFlash(
      ctx,
      "success",
      `Delete complete. Removed ${deleted}, skipped ${notFound} not found or already deleted.`,
    );
    return redirect("/admin/configs");
  }),
);

register(
  "POST",
  "/admin/configs/delete",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const configIds = parseConfigIds(form.getAll("config_ids"));
    if (!configIds.length) {
      pushFlash(ctx, "error", "Select at least one config to delete.");
      return redirect("/admin/configs");
    }
    const deletedCount = await hardDeleteConfigs(ctx.env, configIds);
    pushFlash(ctx, "success", `Deleted ${deletedCount} config(s).`);
    return redirect("/admin/configs");
  }),
);

register(
  "POST",
  "/admin/configs/:id/delete",
  withAdmin(async (ctx, params) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const deletedCount = await hardDeleteConfigs(ctx.env, [parseIdParam(params.id)]);
    pushFlash(ctx, "success", `Deleted ${deletedCount} config(s).`);
    return redirect("/admin/configs");
  }),
);

register(
  "GET",
  "/admin/configs/export/all",
  withAdmin((ctx) => buildExportResponse(ctx.env, "configs-all.txt")),
);

register(
  "GET",
  "/admin/configs/export/enabled",
  withAdmin((ctx) => buildExportResponse(ctx.env, "configs-enabled.txt")),
);

async function buildExportResponse(env, filename) {
  const rows = await listConfigExportRows(env);
  const body = rows.map((row) => row.raw_config).join("\n");
  return {
    ...text(body),
    headers: { "Content-Disposition": `attachment; filename="${filename}"` },
  };
}
