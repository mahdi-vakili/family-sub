import { register } from "../router.js";
import { html, redirect } from "../http.js";
import {
  clearSession,
  ensureCsrf,
  isLoggedIn,
  pushFlash,
  validateCsrf,
} from "../context.js";
import { getAdminByUsername, recordAdminLoginAttempt } from "../db/index.js";
import { verifyPassword } from "../passwords.js";
import { renderDashboardPage, renderLoginPage } from "../views/auth.js";
import { withAdmin } from "./helpers.js";

function resolveNextUrl(rawValue) {
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/admin";
  }
  return rawValue;
}

register("GET", "/", (ctx) => redirect(isLoggedIn(ctx) ? "/admin" : "/admin/login"));

register("GET", "/admin/login", (ctx) => {
  if (isLoggedIn(ctx)) {
    return redirect("/admin");
  }
  ensureCsrf(ctx);
  return html(renderLoginPage(ctx));
});

register("POST", "/admin/login", async (ctx) => {
  const form = await ctx.request.formData();
  validateCsrf(ctx, form.get("csrf_token") || "");

  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const admin = await getAdminByUsername(ctx.env, username);
  const valid = admin ? await verifyPassword(admin.password_hash, password) : false;

  await recordAdminLoginAttempt(ctx.env, username, valid);

  if (!valid) {
    pushFlash(ctx, "error", "Invalid username or password.");
    ensureCsrf(ctx, { rotate: true });
    return html(renderLoginPage(ctx), 401);
  }

  ctx.session.uid = admin.id;
  ctx.session.username = admin.username;
  ctx.session.flash = [];
  ensureCsrf(ctx, { rotate: true });
  ctx.touch();
  return redirect(resolveNextUrl(ctx.url.searchParams.get("next")));
});

register(
  "GET",
  "/admin",
  withAdmin((ctx) => html(renderDashboardPage(ctx))),
);

register(
  "POST",
  "/admin/logout",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    clearSession(ctx);
    return redirect("/admin/login");
  }),
);
