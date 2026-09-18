import { b64urlFromBytes, bytesFromB64url, timingSafeEqual, utf8 } from "./util.js";

export const DEFAULT_ITERATIONS = 100000;
const KEY_BITS = 256;

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
}

export async function hashPassword(password, iterations = DEFAULT_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${b64urlFromBytes(salt)}$${b64urlFromBytes(derived)}`;
}

export async function verifyPassword(stored, password) {
  const parts = String(stored ?? "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    return false;
  }
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  let salt;
  let expected;
  try {
    salt = bytesFromB64url(parts[2]);
    expected = parts[3];
  } catch {
    return false;
  }
  const derived = await derive(password, salt, iterations);
  return timingSafeEqual(b64urlFromBytes(derived), expected);
}
