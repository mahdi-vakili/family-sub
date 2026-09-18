export const COOKIE_NAME = "fs_session";

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    if (!key) {
      continue;
    }
    cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

export function serializeCookie(name, value, options = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${options.path || "/"}`;
  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (options.secure) {
    cookie += "; Secure";
  }
  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }
  return cookie;
}

export function redirect(location, status = 303) {
  return { status, headers: { Location: location }, body: "" };
}

export function html(body, status = 200) {
  return { status, body, contentType: "text/html; charset=utf-8" };
}

export function text(body, status = 200, contentType = "text/plain; charset=utf-8") {
  return { status, body, contentType };
}

export function readInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIsoDate(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return "";
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : raw;
}
