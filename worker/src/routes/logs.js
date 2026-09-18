import { register } from "../router.js";
import { html, parseIsoDate, readInt } from "../http.js";
import {
  listAdminLoginLogs,
  listSubscriptionAccessLogs,
  listSubscriptionUsers,
} from "../db/index.js";
import { renderLogsPage } from "../views/logs.js";
import { withAdmin } from "./helpers.js";

register(
  "GET",
  "/admin/logs",
  withAdmin(async (ctx) => {
    const query = ctx.url.searchParams;
    const subscriptionFilters = {
      userId: readInt(query.get("sub_user_id")),
      dateFrom: parseIsoDate(query.get("sub_date_from")),
      dateTo: parseIsoDate(query.get("sub_date_to")),
    };
    const adminFilters = {
      username: String(query.get("admin_username") || "").trim(),
      dateFrom: parseIsoDate(query.get("admin_date_from")),
      dateTo: parseIsoDate(query.get("admin_date_to")),
    };

    const [subscriptionLogs, adminLoginLogs, subscriptionUsers] = await Promise.all([
      listSubscriptionAccessLogs(ctx.env, subscriptionFilters),
      listAdminLoginLogs(ctx.env, adminFilters),
      listSubscriptionUsers(ctx.env),
    ]);

    return html(
      renderLogsPage(ctx, {
        subscriptionLogs,
        adminLoginLogs,
        subscriptionUsers,
        subscriptionFilters,
        adminFilters,
      }),
    );
  }),
);
