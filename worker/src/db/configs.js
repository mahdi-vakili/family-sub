export async function listConfigs(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, raw_config, created_at FROM configs ORDER BY id DESC",
  ).all();
  return results ?? [];
}

export async function importConfigs(env, configLines) {
  if (!configLines.length) {
    return { inserted: 0, duplicates: 0 };
  }
  const statements = configLines.map((line) =>
    env.DB.prepare("INSERT OR IGNORE INTO configs (raw_config) VALUES (?)").bind(line),
  );
  const results = await env.DB.batch(statements);
  const inserted = results.reduce((total, row) => total + (row.meta?.changes ?? 0), 0);
  return { inserted, duplicates: configLines.length - inserted };
}

export async function deleteConfigsByRaw(env, configLines) {
  if (!configLines.length) {
    return 0;
  }
  const statements = configLines.map((line) =>
    env.DB.prepare("DELETE FROM configs WHERE raw_config = ?").bind(line),
  );
  const results = await env.DB.batch(statements);
  return results.reduce((total, row) => total + (row.meta?.changes ?? 0), 0);
}

export async function hardDeleteConfigs(env, configIds) {
  if (!configIds.length) {
    return 0;
  }
  const placeholders = configIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `DELETE FROM configs WHERE id IN (${placeholders})`,
  )
    .bind(...configIds)
    .run();
  return result.meta?.changes ?? 0;
}

export async function listConfigExportRows(env) {
  const { results } = await env.DB.prepare(
    "SELECT raw_config FROM configs ORDER BY id ASC",
  ).all();
  return results ?? [];
}
