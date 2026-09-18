const URI_PATTERN = /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>'"`]+/g;
const URI_FULL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s<>'"`]+$/;
const TRAILING_PUNCTUATION = new Set(".,;:)]}>".split(""));
const EXCLUDED_SCHEMES = new Set(["https", "http"]);

export function normalizeConfigLine(configLine) {
  let candidate = String(configLine ?? "").trim();
  while (candidate && TRAILING_PUNCTUATION.has(candidate[candidate.length - 1])) {
    candidate = candidate.slice(0, -1);
  }
  return isValidConfigLine(candidate) ? candidate : "";
}

export function isValidConfigLine(configLine) {
  return URI_FULL_PATTERN.test(configLine);
}

export function extractConfigLines(rawText, { excludeWebUrls = true } = {}) {
  const seen = new Set();
  const results = [];
  const matches = String(rawText ?? "").matchAll(URI_PATTERN);

  for (const match of matches) {
    const candidate = normalizeConfigLine(match[0]);
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    if (excludeWebUrls && isWebUrl(candidate)) {
      continue;
    }
    seen.add(candidate);
    results.push(candidate);
  }

  return results;
}

function isWebUrl(configLine) {
  const scheme = configLine.split("://", 1)[0].toLowerCase();
  return EXCLUDED_SCHEMES.has(scheme);
}

export function buildSubscriptionSlug(name) {
  const normalized = String(name ?? "").normalize("NFKD").replace(/[^\u0000-\u007F]/g, "");
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "member";
}
