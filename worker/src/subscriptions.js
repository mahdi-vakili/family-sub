import { extractConfigLines } from "./parser.js";
import { nowIso } from "./util.js";
import {
  getSubscriptionLink,
  listSubscriptionLinks,
  replaceSubscriptionLinkConfigs,
  updateSubscriptionLinkStatus,
} from "./db/links.js";

const FETCH_TIMEOUT_MS = 30000;
const URI_TEST = /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>'"`]+/;

export async function fetchAllSubscriptionLinks(env) {
  const links = await listSubscriptionLinks(env);
  for (const link of links) {
    await fetchSubscriptionLink(env, link.id);
  }
}

export async function fetchSubscriptionLink(env, linkId) {
  const link = await getSubscriptionLink(env, linkId);
  if (!link) {
    return;
  }
  try {
    const response = await fetch(link.url, {
      headers: { "User-Agent": "family-sub/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const configs = parseUpstreamConfigs(buffer);
    await replaceSubscriptionLinkConfigs(env, link.id, configs, nowIso());
    await updateSubscriptionLinkStatus(env, link.id, nowIso(), null);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 500);
    await updateSubscriptionLinkStatus(env, link.id, nowIso(), message);
  }
}

export function parseUpstreamConfigs(buffer) {
  const text = new TextDecoder().decode(buffer).trim();
  const source = tryBase64Decode(text);
  return extractConfigLines(source, { excludeWebUrls: false });
}

function tryBase64Decode(text) {
  const cleaned = text.replace(/\s+/g, "");
  if (!cleaned) {
    return text;
  }
  try {
    let normalized = cleaned.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) {
      normalized += "=";
    }
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    if (URI_TEST.test(decoded)) {
      return decoded;
    }
  } catch {
    return text;
  }
  return text;
}
