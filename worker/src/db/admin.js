export async function getAdminByUsername(env, username) {
  return env.DB.prepare(
    "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
  )
    .bind(username)
    .first();
}

export async function recordAdminLoginAttempt(env, username, succeeded) {
  await env.DB.prepare(
    "INSERT INTO admin_login_logs (username, succeeded) VALUES (?, ?)",
  )
    .bind(username, succeeded ? 1 : 0)
    .run();
}
