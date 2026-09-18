import { register } from "../router.js";
import { html, redirect } from "../http.js";
import { pushFlash, validateCsrf } from "../context.js";
import {
  createSubscriptionUser,
  deleteSubscriptionUser,
  getActiveSubscriptionUserByToken,
  listActiveConfigs,
  listSubscriptionConfigsForUser,
  listSubscriptionUsers,
  listUserExcludedConfigIds,
  recordSubscriptionAccess,
  replaceUserExclusions,
  updateSubscriptionUser,
} from "../db/index.js";
import { renderUserEditPage, renderUsersPage } from "../views/users.js";
import { getUserOr404, parseConfigIds, parseIdParam, withAdmin } from "./helpers.js";

const MAX_USER_NAME_LENGTH = 100;

function validateUserName(rawName) {
  const name = String(rawName || "").trim();
  if (!name) {
    return { name: "", error: "User name is required." };
  }
  if (name.length > MAX_USER_NAME_LENGTH) {
    return {
      name: "",
      error: `User name must be ${MAX_USER_NAME_LENGTH} characters or fewer.`,
    };
  }
  return { name, error: "" };
}

register(
  "GET",
  "/admin/users",
  withAdmin(async (ctx) => html(renderUsersPage(ctx, await listSubscriptionUsers(ctx.env)))),
);

register(
  "POST",
  "/admin/users",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const { name, error } = validateUserName(form.get("name"));
    if (error) {
      pushFlash(ctx, "error", error);
      return redirect("/admin/users");
    }
    const user = await createSubscriptionUser(ctx.env, name);
    pushFlash(ctx, "success", `Created subscription user "${user.name}".`);
    return redirect(`/admin/users/${user.id}`);
  }),
);

register(
  "GET",
  "/admin/users/:id",
  withAdmin(async (ctx, params) => {
    const userId = parseIdParam(params.id);
    const user = await getUserOr404(ctx.env, userId);
    const activeConfigs = await listActiveConfigs(ctx.env);
    const excludedConfigIds = await listUserExcludedConfigIds(ctx.env, userId);
    return html(renderUserEditPage(ctx, { user, activeConfigs, excludedConfigIds }));
  }),
);

register(
  "POST",
  "/admin/users/:id",
  withAdmin(async (ctx, params) => {
    const userId = parseIdParam(params.id);
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    await getUserOr404(ctx.env, userId);

    const { name, error } = validateUserName(form.get("name"));
    if (error) {
      pushFlash(ctx, "error", error);
      return redirect(`/admin/users/${userId}`);
    }

    const activeConfigs = await listActiveConfigs(ctx.env);
    const allowedIds = new Set(activeConfigs.map((config) => config.id));
    const excludedConfigIds = parseConfigIds(form.getAll("excluded_config_ids"), allowedIds);

    await updateSubscriptionUser(ctx.env, userId, name, form.get("is_active") === "1");
    await replaceUserExclusions(ctx.env, userId, excludedConfigIds);

    pushFlash(ctx, "success", "User settings saved.");
    return redirect(`/admin/users/${userId}`);
  }),
);

register(
  "POST",
  "/admin/users/:id/delete",
  withAdmin(async (ctx, params) => {
    const userId = parseIdParam(params.id);
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const user = await getUserOr404(ctx.env, userId);
    const deletedCount = await deleteSubscriptionUser(ctx.env, userId);
    if (deletedCount) {
      pushFlash(ctx, "success", `Deleted subscription user "${user.name}".`);
    }
    return redirect("/admin/users");
  }),
);

register("GET", "/subscriptions/:token", handleSubscriptionFeed);
register("GET", "/subscriptions/:token/:slug", handleSubscriptionFeed);

async function handleSubscriptionFeed(ctx, params) {
  const user = await getActiveSubscriptionUserByToken(ctx.env, params.token);
  if (!user) {
    return { status: 404, body: "Not found\n", contentType: "text/plain; charset=utf-8" };
  }
  const configs = await listSubscriptionConfigsForUser(ctx.env, user.id);
  await recordSubscriptionAccess(ctx.env, user.id);
  const body = configs.map((config) => config.raw_config).join("\n");
  return { status: 200, body, contentType: "text/plain; charset=utf-8" };
}
