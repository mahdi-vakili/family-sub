import { consumeFlash, ensureCsrf, isLoggedIn } from "../context.js";
import { escapeHtml } from "../util.js";

const NAV_ITEMS = [
  ["/admin", "Dashboard"],
  ["/admin/configs", "Configs"],
  ["/admin/subscription-links", "Sub Links"],
  ["/admin/users", "Users"],
  ["/admin/logs", "Logs"],
];

export function renderLayout(ctx, { title, body }) {
  const flashes = consumeFlash(ctx);
  const flashHtml = flashes.length
    ? `<section class="flash-stack">${flashes
        .map(
          (flash) =>
            `<div class="flash flash-${escapeHtml(flash.category)}">${escapeHtml(
              flash.message,
            )}</div>`,
        )
        .join("")}</section>`
    : "";

  const loggedIn = isLoggedIn(ctx);
  const navHtml = loggedIn
    ? `<nav class="site-nav" aria-label="Primary">${NAV_ITEMS.map(
        ([href, label]) => `<a href="${href}">${label}</a>`,
      ).join("")}</nav>`
    : "";
  const logoutHtml = loggedIn
    ? `<form method="post" action="/admin/logout">
         <input type="hidden" name="csrf_token" value="${escapeHtml(ensureCsrf(ctx))}">
         <button type="submit" class="secondary-button">Log Out</button>
       </form>`
    : "";
  const subtitle = loggedIn
    ? `<p class="subtitle">Signed in as ${escapeHtml(ctx.session.username ?? "")}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/static/styles.css">
  </head>
  <body>
    <header class="site-header">
      <div class="shell">
        <div>
          <a class="brand" href="/admin">Subscription Admin</a>
          ${subtitle}
        </div>
        <div class="header-actions">${navHtml}${logoutHtml}</div>
      </div>
    </header>
    <main class="shell">
      ${flashHtml}
      ${body}
    </main>
  </body>
</html>`;
}

export function renderError(ctx, title, message, status) {
  const body = `
    <section class="panel stack-section">
      <div class="section-heading">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(message)}</p>
        </div>
        <a class="table-link" href="${isLoggedIn(ctx) ? "/admin" : "/admin/login"}">Return</a>
      </div>
    </section>`;
  return {
    status,
    body: renderLayout(ctx, { title, body }),
    contentType: "text/html; charset=utf-8",
  };
}
