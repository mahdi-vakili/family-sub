import { escapeHtml } from "../util.js";
import { renderLayout } from "./layout.js";

export function renderLogsPage(ctx, {
  subscriptionLogs,
  adminLoginLogs,
  subscriptionUsers,
  subscriptionFilters,
  adminFilters,
}) {
  const userOptions = subscriptionUsers
    .map(
      (user) =>
        `<option value="${user.id}" ${
          subscriptionFilters.userId === user.id ? "selected" : ""
        }>${escapeHtml(user.name)}</option>`,
    )
    .join("");

  const subscriptionRows = subscriptionLogs.length
    ? subscriptionLogs
        .map(
          (log) =>
            `<tr><td>${escapeHtml(log.user_name)}</td><td>${escapeHtml(log.accessed_at)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2">No subscription access has been logged yet.</td></tr>`;

  const adminRows = adminLoginLogs.length
    ? adminLoginLogs
        .map(
          (log) => `
        <tr>
          <td>${escapeHtml(log.username)}</td>
          <td>${
            log.succeeded
              ? `<span class="status-pill active">Success</span>`
              : `<span class="status-pill deleted">Failed</span>`
          }</td>
          <td>${escapeHtml(log.created_at)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">No admin login attempts have been logged yet.</td></tr>`;

  const body = `
    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>Activity Logs</h1>
          <p>Review subscription fetches and admin sign-in attempts in one place.</p>
        </div>
      </div>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h2>Subscription Access</h2>
          <p>${subscriptionLogs.length} request(s)</p>
        </div>
      </div>
      <form method="get" action="/admin/logs" class="filter-form stack-section">
        <div class="filter-grid">
          <div>
            <label for="sub_user_id">User</label>
            <select id="sub_user_id" name="sub_user_id">
              <option value="">All users</option>
              ${userOptions}
            </select>
          </div>
          <div>
            <label for="sub_date_from">From</label>
            <input id="sub_date_from" type="date" name="sub_date_from" value="${escapeHtml(subscriptionFilters.dateFrom)}">
          </div>
          <div>
            <label for="sub_date_to">To</label>
            <input id="sub_date_to" type="date" name="sub_date_to" value="${escapeHtml(subscriptionFilters.dateTo)}">
          </div>
        </div>
        <div class="filter-actions">
          <button type="submit">Filter Subscription Logs</button>
          <a class="button-link secondary-button" href="/admin/logs">Reset</a>
        </div>
        <input type="hidden" name="admin_username" value="${escapeHtml(adminFilters.username)}">
        <input type="hidden" name="admin_date_from" value="${escapeHtml(adminFilters.dateFrom)}">
        <input type="hidden" name="admin_date_to" value="${escapeHtml(adminFilters.dateTo)}">
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Timestamp</th></tr></thead>
          <tbody>${subscriptionRows}</tbody>
        </table>
      </div>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h2>Admin Login Activity</h2>
          <p>${adminLoginLogs.length} attempt(s)</p>
        </div>
      </div>
      <form method="get" action="/admin/logs" class="filter-form stack-section">
        <div class="filter-grid">
          <div>
            <label for="admin_username">Username</label>
            <input id="admin_username" type="text" name="admin_username" value="${escapeHtml(adminFilters.username)}" placeholder="admin">
          </div>
          <div>
            <label for="admin_date_from">From</label>
            <input id="admin_date_from" type="date" name="admin_date_from" value="${escapeHtml(adminFilters.dateFrom)}">
          </div>
          <div>
            <label for="admin_date_to">To</label>
            <input id="admin_date_to" type="date" name="admin_date_to" value="${escapeHtml(adminFilters.dateTo)}">
          </div>
        </div>
        <div class="filter-actions">
          <button type="submit">Filter Admin Logs</button>
          <a class="button-link secondary-button" href="/admin/logs">Reset</a>
        </div>
        <input type="hidden" name="sub_user_id" value="${escapeHtml(subscriptionFilters.userId ?? "")}">
        <input type="hidden" name="sub_date_from" value="${escapeHtml(subscriptionFilters.dateFrom)}">
        <input type="hidden" name="sub_date_to" value="${escapeHtml(subscriptionFilters.dateTo)}">
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Username</th><th>Result</th><th>Timestamp</th></tr></thead>
          <tbody>${adminRows}</tbody>
        </table>
      </div>
    </section>`;
  return renderLayout(ctx, { title: "Logs", body });
}
