import { ensureCsrf } from "../context.js";
import { escapeHtml } from "../util.js";
import { renderLayout } from "./layout.js";

const REFRESH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4V1L8 5l4 4V6a6 6 0 1 1 0 12 6 6 0 0 1-6-6H4a8 8 0 1 0 8-8Z" /></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm1 12a2 2 0 0 1-2-2V8h12v11a2 2 0 0 1-2 2H8Z" /></svg>`;

export function renderSubscriptionLinksPage(ctx, links) {
  const csrf = escapeHtml(ensureCsrf(ctx));
  const rows = links.length
    ? links
        .map(
          (link) => `
        <tr>
          <td><strong>${escapeHtml(link.name)}</strong></td>
          <td><code class="config-line">${escapeHtml(link.url)}</code></td>
          <td>${escapeHtml(link.last_fetched_at || "Never")}</td>
          <td>${
            link.last_error
              ? `<span class="status-pill deleted" title="${escapeHtml(link.last_error)}">Error</span>`
              : `<span class="status-pill active">OK</span>`
          }</td>
          <td>
            <div class="row-actions">
              <form method="post" action="/admin/subscription-links/${link.id}/fetch">
                <input type="hidden" name="csrf_token" value="${csrf}">
                <button type="submit" class="secondary-button icon-button" aria-label="Fetch now from ${escapeHtml(link.name)}">${REFRESH_ICON}</button>
              </form>
              <form method="post" action="/admin/subscription-links/${link.id}/delete">
                <input type="hidden" name="csrf_token" value="${csrf}">
                <button type="submit" class="danger-button icon-button" aria-label="Delete subscription link ${escapeHtml(link.name)}">${TRASH_ICON}</button>
              </form>
            </div>
          </td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="5">No subscription links added yet.</td></tr>`;

  const body = `
    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>Subscription Links</h1>
          <p>Add external subscription URLs. Configs are fetched automatically every 2 hours and appended to all users' feeds.</p>
        </div>
      </div>
      <form method="post" action="/admin/subscription-links" class="stack">
        <input type="hidden" name="csrf_token" value="${csrf}">
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:0.9rem;">
          <div>
            <label for="link_name">Name</label>
            <input id="link_name" type="text" name="name" placeholder="My Provider" required>
          </div>
          <div>
            <label for="link_url">Subscription URL</label>
            <input id="link_url" type="url" name="url" placeholder="https://example.com/sub" required>
          </div>
        </div>
        <div><button type="submit">Add Subscription Link</button></div>
      </form>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h2>Active Links</h2>
          <p>${links.length} link(s)</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>URL</th><th>Last Fetched</th><th>Last Error</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  return renderLayout(ctx, { title: "Subscription Links", body });
}
