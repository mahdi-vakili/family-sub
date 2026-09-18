import { randomToken } from "../util.js";
import { listAllSubscriptionLinkConfigs } from "./links.js";

const TOKEN_BYTES = 32;
const TOKEN_ATTEMPTS = 5;

const USER_COLUMNS = "id, name, token, is_active, created_at";

export async function listSubscriptionUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${USER_COLUMNS} FROM subscription_users ORDER BY id DESC`,
  ).all();
  return results ?? [];
}

export async function createSubscriptionUser(env, name) {
  for (let attempt = 0; attempt < TOKEN_ATTEMPTS; attempt += 1) {
    const token = randomToken(TOKEN_BYTES);
    const result = await env.DB.prepare(
      "INSERT OR IGNORE INTO subscription_users (name, token) VALUES (?, ?)",
    )
      .bind(name, token)
      .run();
    if ((result.meta?.changes ?? 0) > 0) {
      return getSubscriptionUser(env, result.meta.last_row_id);
    }
  }
  throw new Error("Could not generate a unique subscription token.");
}

export async function getSubscriptionUser(env, userId) {
  return env.DB.prepare(
    `SELECT ${USER_COLUMNS} FROM subscription_users WHERE id = ?`,
  )
    .bind(userId)
    .first();
}

export async function getActiveSubscriptionUserByToken(env, token) {
  return env.DB.prepare(
    `SELECT ${USER_COLUMNS} FROM subscription_users WHERE token = ? AND is_active = 1`,
  )
    .bind(token)
    .first();
}

export async function updateSubscriptionUser(env, userId, name, isActive) {
  const result = await env.DB.prepare(
    "UPDATE subscription_users SET name = ?, is_active = ? WHERE id = ?",
  )
    .bind(name, isActive ? 1 : 0, userId)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    return null;
  }
  return getSubscriptionUser(env, userId);
}

export async function deleteSubscriptionUser(env, userId) {
  const result = await env.DB.prepare(
    "DELETE FROM subscription_users WHERE id = ?",
  )
    .bind(userId)
    .run();
  return result.meta?.changes ?? 0;
}

export async function listActiveConfigs(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, raw_config FROM configs ORDER BY id DESC",
  ).all();
  return results ?? [];
}

export async function listUserExcludedConfigIds(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT config_id FROM user_config_exclusions WHERE user_id = ?",
  )
    .bind(userId)
    .all();
  return new Set((results ?? []).map((row) => row.config_id));
}

export async function replaceUserExclusions(env, userId, configIds) {
  const statements = [
    env.DB.prepare("DELETE FROM user_config_exclusions WHERE user_id = ?").bind(userId),
  ];
  for (const configId of configIds) {
    statements.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO user_config_exclusions (user_id, config_id) VALUES (?, ?)",
      ).bind(userId, configId),
    );
  }
  await env.DB.batch(statements);
}

export async function listSubscriptionConfigsForUser(env, userId) {
  const { results } = await env.DB.prepare(
    `SELECT c.raw_config
       FROM configs AS c
      WHERE NOT EXISTS (
            SELECT 1 FROM user_config_exclusions AS e
             WHERE e.user_id = ? AND e.config_id = c.id
      )
      ORDER BY c.id ASC`,
  )
    .bind(userId)
    .all();
  const linkConfigs = await listAllSubscriptionLinkConfigs(env);
  return [...(results ?? []), ...linkConfigs];
}

export async function recordSubscriptionAccess(env, userId) {
  await env.DB.prepare(
    "INSERT INTO subscription_access_logs (user_id) VALUES (?)",
  )
    .bind(userId)
    .run();
}
