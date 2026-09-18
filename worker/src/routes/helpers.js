import { HttpError, requireAdmin } from "../context.js";
import { getSubscriptionUser } from "../db/index.js";

export function withAdmin(handler) {
  return (ctx, params) => {
    const denied = requireAdmin(ctx);
    if (denied) {
      return denied;
    }
    return handler(ctx, params);
  };
}

export function parseConfigIds(rawValues, allowedIds = null) {
  const allowed = allowedIds ? new Set(allowedIds) : null;
  const seen = new Set();
  const result = [];
  for (const rawValue of rawValues) {
    const configId = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(configId) || seen.has(configId)) {
      continue;
    }
    if (allowed && !allowed.has(configId)) {
      continue;
    }
    seen.add(configId);
    result.push(configId);
  }
  return result;
}

export async function getUserOr404(env, userId) {
  const user = await getSubscriptionUser(env, userId);
  if (!user) {
    throw new HttpError(404, "Page Not Found", "The page you requested does not exist.");
  }
  return user;
}

export function parseIdParam(rawValue) {
  const id = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new HttpError(404, "Page Not Found", "The page you requested does not exist.");
  }
  return id;
}
