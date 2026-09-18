export async function listSubscriptionAccessLogs(env, { userId = null, dateFrom = "", dateTo = "" } = {}) {
  const filters = [];
  const params = [];
  if (userId !== null && userId !== undefined) {
    filters.push("l.user_id = ?");
    params.push(userId);
  }
  if (dateFrom) {
    filters.push("date(l.accessed_at) >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push("date(l.accessed_at) <= ?");
    params.push(dateTo);
  }
  const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT l.id, u.name AS user_name, l.accessed_at
       FROM subscription_access_logs AS l
       JOIN subscription_users AS u ON u.id = l.user_id${where}
      ORDER BY l.id DESC`,
  )
    .bind(...params)
    .all();
  return results ?? [];
}

export async function listAdminLoginLogs(env, { username = "", dateFrom = "", dateTo = "" } = {}) {
  const filters = [];
  const params = [];
  if (username) {
    filters.push("username = ?");
    params.push(username);
  }
  if (dateFrom) {
    filters.push("date(created_at) >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push("date(created_at) <= ?");
    params.push(dateTo);
  }
  const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
  const { results } = await env.DB.prepare(
    `SELECT id, username, succeeded, created_at FROM admin_login_logs${where} ORDER BY id DESC`,
  )
    .bind(...params)
    .all();
  return results ?? [];
}
