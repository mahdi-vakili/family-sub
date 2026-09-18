import schemaSql from "../schema.sql";
import { getAdminByUsername } from "./db/admin.js";
import { DEFAULT_ITERATIONS, hashPassword, verifyPassword } from "./passwords.js";

const SCHEMA_STATEMENTS = schemaSql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const initCache = new WeakMap();

export function ensureDatabase(env) {
  if (!initCache.has(env.DB)) {
    const pending = runInit(env).catch((error) => {
      initCache.delete(env.DB);
      throw error;
    });
    initCache.set(env.DB, pending);
  }
  return initCache.get(env.DB);
}

async function runInit(env) {
  await env.DB.batch(SCHEMA_STATEMENTS.map((statement) => env.DB.prepare(statement)));
  await ensureAdmin(env);
}

function parseIterations(rawValue) {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_ITERATIONS;
  }
  return parsed;
}

async function ensureAdmin(env) {
  const username = env.ADMIN_USERNAME || "admin";
  const password = env.ADMIN_PASSWORD || "change-me-now";
  const iterations = parseIterations(env.PBKDF2_ITERATIONS);

  const existing = await getAdminByUsername(env, username);
  if (!existing) {
    const passwordHash = await hashPassword(password, iterations);
    await env.DB.prepare(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
    )
      .bind(username, passwordHash)
      .run();
    return;
  }

  const matches = await verifyPassword(existing.password_hash, password);
  if (!matches) {
    const passwordHash = await hashPassword(password, iterations);
    await env.DB.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, existing.id)
      .run();
  }
}
