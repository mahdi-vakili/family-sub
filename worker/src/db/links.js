import { nowIso } from "../util.js";

const LINK_COLUMNS = "id, name, url, last_fetched_at, last_error, created_at";

export async function listSubscriptionLinks(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${LINK_COLUMNS} FROM subscription_links ORDER BY id DESC`,
  ).all();
  return results ?? [];
}

export async function getSubscriptionLink(env, linkId) {
  return env.DB.prepare(
    `SELECT ${LINK_COLUMNS} FROM subscription_links WHERE id = ?`,
  )
    .bind(linkId)
    .first();
}

export async function createSubscriptionLink(env, name, url) {
  const result = await env.DB.prepare(
    "INSERT INTO subscription_links (name, url) VALUES (?, ?)",
  )
    .bind(name, url)
    .run();
  return getSubscriptionLink(env, result.meta.last_row_id);
}

export async function deleteSubscriptionLink(env, linkId) {
  const result = await env.DB.prepare(
    "DELETE FROM subscription_links WHERE id = ?",
  )
    .bind(linkId)
    .run();
  return result.meta?.changes ?? 0;
}

export async function updateSubscriptionLinkStatus(env, linkId, lastFetchedAt, lastError) {
  await env.DB.prepare(
    "UPDATE subscription_links SET last_fetched_at = ?, last_error = ? WHERE id = ?",
  )
    .bind(lastFetchedAt, lastError, linkId)
    .run();
}

export async function replaceSubscriptionLinkConfigs(env, linkId, rawConfigs, fetchedAt) {
  const statements = [
    env.DB.prepare(
      "DELETE FROM subscription_link_configs WHERE subscription_link_id = ?",
    ).bind(linkId),
  ];
  for (const rawConfig of rawConfigs) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO subscription_link_configs (subscription_link_id, raw_config, fetched_at)
         VALUES (?, ?, ?)`,
      ).bind(linkId, rawConfig, fetchedAt),
    );
  }
  await env.DB.batch(statements);
}

export async function listAllSubscriptionLinkConfigs(env) {
  const { results } = await env.DB.prepare(
    "SELECT raw_config FROM subscription_link_configs ORDER BY id ASC",
  ).all();
  return results ?? [];
}

export function touchFetchedAt() {
  return nowIso();
}
