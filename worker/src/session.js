import {
  b64urlFromString,
  stringFromB64url,
  timingSafeEqual,
  utf8,
  b64urlFromBytes,
} from "./util.js";

const keyCache = new Map();

async function hmacKey(secret) {
  if (!keyCache.has(secret)) {
    keyCache.set(
      secret,
      crypto.subtle.importKey(
        "raw",
        utf8(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      ),
    );
  }
  return keyCache.get(secret);
}

async function sign(secret, data) {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, utf8(data));
  return b64urlFromBytes(signature);
}

export async function serializeSession(session, secret) {
  const payload = b64urlFromString(JSON.stringify(session));
  const signature = await sign(secret, payload);
  return `${payload}.${signature}`;
}

export async function parseSession(token, secret) {
  if (!token || !token.includes(".")) {
    return null;
  }
  const index = token.lastIndexOf(".");
  const payload = token.slice(0, index);
  const signature = token.slice(index + 1);
  const expected = await sign(secret, payload);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }
  try {
    const session = JSON.parse(stringFromB64url(payload));
    if (!session || typeof session !== "object") {
      return null;
    }
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
