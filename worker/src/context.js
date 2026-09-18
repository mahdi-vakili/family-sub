import { COOKIE_NAME, parseCookies, redirect } from "./http.js";
import { parseSession } from "./session.js";
import { randomToken } from "./util.js";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export class HttpError extends Error {
  constructor(status, title, message) {
    super(message);
    this.status = status;
    this.title = title;
    this.message = message;
  }
}

export async function createContext(request, env) {
  const cookies = parseCookies(request);
  let session = await parseSession(cookies[COOKIE_NAME], env.SECRET_KEY);
  if (!session) {
    session = { uid: null, username: null, csrf: null, flash: [] };
  }
  if (!session.expiresAt) {
    session.expiresAt = Date.now() + SESSION_TTL_MS;
  }
  return {
    request,
    env,
    url: new URL(request.url),
    session,
    dirty: false,
    touch() {
      this.dirty = true;
    },
  };
}

export function isLoggedIn(ctx) {
  return ctx.session.uid !== null && ctx.session.uid !== undefined;
}

export function ensureCsrf(ctx, { rotate = false } = {}) {
  if (rotate || !ctx.session.csrf) {
    ctx.session.csrf = randomToken(32);
    ctx.touch();
  }
  return ctx.session.csrf;
}

export function validateCsrf(ctx, token) {
  if (!ctx.session.csrf || !token || token !== ctx.session.csrf) {
    throw new HttpError(
      400,
      "Bad Request",
      "The request was invalid. Reload the page and try again.",
    );
  }
}

export function pushFlash(ctx, category, message) {
  ctx.session.flash = [...(ctx.session.flash || []), { category, message }];
  ctx.touch();
}

export function consumeFlash(ctx) {
  const messages = ctx.session.flash || [];
  if (messages.length) {
    ctx.session.flash = [];
    ctx.touch();
  }
  return messages;
}

export function requireAdmin(ctx) {
  if (isLoggedIn(ctx)) {
    return null;
  }
  const next = encodeURIComponent(`${ctx.url.pathname}${ctx.url.search}`);
  return redirect(`/admin/login?next=${next}`);
}

export function clearSession(ctx) {
  ctx.session = {
    uid: null,
    username: null,
    csrf: randomToken(32),
    flash: [],
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  ctx.touch();
}
