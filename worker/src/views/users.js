import { ensureCsrf } from "../context.js";
import { buildSubscriptionSlug } from "../parser.js";
import { escapeHtml } from "../util.js";
import { renderLayout } from "./layout.js";

export function subscriptionUrl(ctx, user) {
  return `${ctx.url.origin}/subscriptions/${user.token}/${buildSubscriptionSlug(user.name)}`;
}

export function renderUsersPage(ctx, users) {
  const csrf = escapeHtml(ensureCsrf(ctx));
  const rows = users.length
    ? users
        .map(
          (user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${
            user.is_active
              ? `<span class="status-pill active">Active</span>`
              : `<span class="status-pill deleted">Revoked</span>`
          }</td>
          <td><input class="readonly-input" type="text" value="${escapeHtml(
            subscriptionUrl(ctx, user),
          )}" readonly></td>
          <td class="row-actions">
            <a class="table-link" href="/admin/users/${user.id}">Edit</a>
            <form method="post" action="/admin/users/${user.id}/delete">
              <input type="hidden" name="csrf_token" value="${csrf}">
              <button type="submit" class="danger-button">Delete</button>
            </form>
          </td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="4">No subscription users created yet.</td></tr>`;

  const body = `
    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>Subscription Users</h1>
          <p>Create family users here. Each one receives a unique tokenized subscription URL.</p>
        </div>
      </div>
      <form method="post" action="/admin/users" class="stack">
        <input type="hidden" name="csrf_token" value="${csrf}">
        <label for="name">New User Name</label>
        <input id="name" name="name" type="text" maxlength="100" placeholder="Family member name" required>
        <div><button type="submit">Create User</button></div>
      </form>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h2>Existing Users</h2>
          <p>${users.length} user(s)</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Subscription URL</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  return renderLayout(ctx, { title: "Users", body });
}

export function renderUserEditPage(ctx, { user, activeConfigs, excludedConfigIds }) {
  const csrf = escapeHtml(ensureCsrf(ctx));
  const configRows = activeConfigs.length
    ? activeConfigs
        .map(
          (config) => `
        <label class="checkbox-row compact-checkbox-row">
          <span class="config-item-body">
            <span class="config-item-id">Config ${config.id}</span>
            <span class="config-item-state">Included by default</span>
            <code class="config-line compact-config-line">${escapeHtml(config.raw_config)}</code>
          </span>
          <span class="checkbox-decision">
            <input type="checkbox" name="excluded_config_ids" value="${config.id}" ${
              excludedConfigIds.has(config.id) ? "checked" : ""
            }>
            <span>Exclude</span>
          </span>
        </label>`,
        )
        .join("")
    : `<p class="empty-state">No active configs are available to exclude.</p>`;

  const body = `
    <div class="page-header stack-section">
      <div>
        <h1>Manage ${escapeHtml(user.name)}</h1>
        <p>Every active config is included by default. Use the controls below only for configs you want to exclude from this user&apos;s subscription.</p>
      </div>
      <a class="table-link" href="/admin/users">Back to Users</a>
    </div>

    <form method="post" action="/admin/users/${user.id}" class="user-edit-layout">
      <input type="hidden" name="csrf_token" value="${csrf}">
      <section class="panel stack card-tight">
        <h2>User Settings</h2>
        <label for="name">User Name</label>
        <input id="name" name="name" type="text" maxlength="100" value="${escapeHtml(user.name)}" required>
        <label for="subscription_url">Subscription URL</label>
        <textarea id="subscription_url" class="readonly-input compact-code-input" rows="2" readonly>${escapeHtml(
          subscriptionUrl(ctx, user),
        )}</textarea>
        <label class="toggle-row">
          <input type="checkbox" name="is_active" value="1" ${user.is_active ? "checked" : ""}>
          <span>Subscription token is active</span>
        </label>
        <div><button type="submit">Save User</button></div>
      </section>

      <section class="panel stack card-tight">
        <div class="section-heading">
          <div>
            <h2>Subscription Configs</h2>
            <p>Rows stay included unless you explicitly turn on <strong>Exclude</strong>.</p>
          </div>
        </div>
        <div class="checkbox-list compact-checkbox-list">${configRows}</div>
      </section>
    </form>`;
  return renderLayout(ctx, { title: "Manage User", body });
}
