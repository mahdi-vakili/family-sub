import { ensureCsrf } from "../context.js";
import { escapeHtml } from "../util.js";
import { renderLayout } from "./layout.js";

const TRASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm1 12a2 2 0 0 1-2-2V8h12v11a2 2 0 0 1-2 2H8Z" /></svg>`;

export function renderConfigsPage(ctx, configs) {
  const csrf = escapeHtml(ensureCsrf(ctx));
  const rows = configs.length
    ? configs
        .map(
          (config) => `
        <tr>
          <td>
            <label class="checkbox-hit-area" aria-label="Select config ${config.id}">
              <input type="checkbox" name="config_ids" value="${config.id}" form="batch-delete-form">
            </label>
          </td>
          <td><code class="config-line">${escapeHtml(config.raw_config)}</code></td>
          <td>
            <form method="post" action="/admin/configs/${config.id}/delete">
              <input type="hidden" name="csrf_token" value="${csrf}">
              <button type="submit" class="danger-button icon-button" aria-label="Delete config ${config.id}">${TRASH_ICON}</button>
            </form>
          </td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">No configs stored yet.</td></tr>`;

  const body = `
    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>Configs</h1>
          <p>Paste noisy text below. The parser will extract URI-style config lines and skip duplicates automatically. HTTP/HTTPS links are ignored.</p>
        </div>
      </div>
      <form method="post" action="/admin/configs/import" class="stack">
        <input type="hidden" name="csrf_token" value="${csrf}">
        <label for="config_blob">Batch Import</label>
        <textarea id="config_blob" name="config_blob" rows="10" placeholder="Paste config text here" required></textarea>
        <div><button type="submit">Import Configs</button></div>
      </form>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>Batch Delete</h1>
          <p>Paste config URIs below. Matching configs will be permanently deleted.</p>
        </div>
      </div>
      <form method="post" action="/admin/configs/delete-by-paste" class="stack">
        <input type="hidden" name="csrf_token" value="${csrf}">
        <label for="delete_blob">Batch Delete</label>
        <textarea id="delete_blob" name="delete_blob" rows="10" placeholder="Paste config text here" required></textarea>
        <div><button type="submit" class="danger-button">Delete Matching Configs</button></div>
      </form>
    </section>

    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h2>Stored Configs</h2>
          <p>${configs.length} config(s)</p>
        </div>
      </div>
      <form id="batch-delete-form" method="post" action="/admin/configs/delete">
        <input type="hidden" name="csrf_token" value="${csrf}">
      </form>
      <div class="table-actions">
        <a class="button-link secondary-button" href="/admin/configs/export/all">Export All</a>
        <button type="submit" form="batch-delete-form" class="danger-button">Delete Selected</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Select</th><th>Config</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  return renderLayout(ctx, { title: "Configs", body });
}
