import { register } from "../router.js";
import { html, redirect } from "../http.js";
import { pushFlash, validateCsrf } from "../context.js";
import {
  createSubscriptionLink,
  deleteSubscriptionLink,
  getSubscriptionLink,
  listSubscriptionLinks,
} from "../db/index.js";
import { fetchSubscriptionLink } from "../subscriptions.js";
import { renderSubscriptionLinksPage } from "../views/links.js";
import { parseIdParam, withAdmin } from "./helpers.js";

const MAX_LINK_NAME_LENGTH = 100;
const MAX_LINK_URL_LENGTH = 2048;

register(
  "GET",
  "/admin/subscription-links",
  withAdmin(async (ctx) =>
    html(renderSubscriptionLinksPage(ctx, await listSubscriptionLinks(ctx.env))),
  ),
);

register(
  "POST",
  "/admin/subscription-links",
  withAdmin(async (ctx) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");

    const name = String(form.get("name") || "").trim();
    const url = String(form.get("url") || "").trim();
    const error = validateLink(name, url);
    if (error) {
      pushFlash(ctx, "error", error);
      return redirect("/admin/subscription-links");
    }

    const link = await createSubscriptionLink(ctx.env, name, url);
    await fetchSubscriptionLink(ctx.env, link.id);
    pushFlash(ctx, "success", `Created subscription link "${name}". Configs fetched.`);
    return redirect("/admin/subscription-links");
  }),
);

register(
  "POST",
  "/admin/subscription-links/:id/delete",
  withAdmin(async (ctx, params) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const deletedCount = await deleteSubscriptionLink(ctx.env, parseIdParam(params.id));
    if (deletedCount) {
      pushFlash(ctx, "success", "Subscription link deleted.");
    }
    return redirect("/admin/subscription-links");
  }),
);

register(
  "POST",
  "/admin/subscription-links/:id/fetch",
  withAdmin(async (ctx, params) => {
    const form = await ctx.request.formData();
    validateCsrf(ctx, form.get("csrf_token") || "");
    const linkId = parseIdParam(params.id);
    const link = await getSubscriptionLink(ctx.env, linkId);
    if (!link) {
      pushFlash(ctx, "error", "Subscription link not found.");
      return redirect("/admin/subscription-links");
    }
    await fetchSubscriptionLink(ctx.env, linkId);
    pushFlash(ctx, "success", `Fetched configs from "${link.name}".`);
    return redirect("/admin/subscription-links");
  }),
);

function validateLink(name, url) {
  if (!name) {
    return "Link name is required.";
  }
  if (name.length > MAX_LINK_NAME_LENGTH) {
    return `Link name must be ${MAX_LINK_NAME_LENGTH} characters or fewer.`;
  }
  if (!url) {
    return "URL is required.";
  }
  if (url.length > MAX_LINK_URL_LENGTH) {
    return `URL must be ${MAX_LINK_URL_LENGTH} characters or fewer.`;
  }
  return "";
}
