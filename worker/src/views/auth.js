import { ensureCsrf } from "../context.js";
import { escapeHtml } from "../util.js";
import { renderLayout } from "./layout.js";

export function renderDashboardPage(ctx) {
  const body = `
    <section class="panel stack-section">
      <h1>Admin Dashboard</h1>
      <p>Routine admin operations are grouped below: manage configs, manage users, export plain-text lists, and review activity logs.</p>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <h2>Configs</h2>
        <p>Import noisy text, delete entries, or export the current config sets.</p>
        <div class="inline-actions">
          <a class="button-link" href="/admin/configs">Open Configs</a>
          <a class="button-link secondary-button" href="/admin/configs/export/enabled">Export Enabled</a>
        </div>
      </article>

      <article class="panel">
        <h2>Subscription Links</h2>
        <p>Manage external subscription URLs that are fetched every 2 hours and merged into all users' feeds.</p>
        <div class="inline-actions">
          <a class="button-link" href="/admin/subscription-links">Open Sub Links</a>
        </div>
      </article>

      <article class="panel">
        <h2>Users</h2>
        <p>Create subscription users, revoke tokens, and set per-user config exclusions.</p>
        <div class="inline-actions">
          <a class="button-link" href="/admin/users">Open Users</a>
        </div>
      </article>

      <article class="panel">
        <h2>Logs</h2>
        <p>Review subscription requests and admin sign-in attempts with timestamps.</p>
        <div class="inline-actions">
          <a class="button-link" href="/admin/logs">Open Logs</a>
        </div>
      </article>
    </section>`;
  return renderLayout(ctx, { title: "Admin Dashboard", body });
}

export function renderLoginPage(ctx) {
  const body = `
    <section class="auth-panel">
      <h1>Admin Login</h1>
      <form method="post" action="/admin/login" class="stack">
        <input type="hidden" name="csrf_token" value="${escapeHtml(ensureCsrf(ctx))}">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" autocomplete="username" required>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">Sign In</button>
      </form>
    </section>`;
  return renderLayout(ctx, { title: "Admin Login", body });
}
