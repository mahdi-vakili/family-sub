import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSubscriptionSlug,
  extractConfigLines,
  normalizeConfigLine,
} from "../src/parser.js";

test("extracts valid config URIs and deduplicates", () => {
  const blob = `
    here is some noise
    vless://uuid@example.com:443?type=ws#Node1
    just text
    trojan://secret@example.com:443
    vless://uuid@example.com:443?type=ws#Node1
  `;
  const lines = extractConfigLines(blob);
  assert.deepEqual(lines, [
    "vless://uuid@example.com:443?type=ws#Node1",
    "trojan://secret@example.com:443",
  ]);
});

test("excludes http and https links by default", () => {
  const blob = "https://example.com/foo vless://uuid@example.com:443";
  assert.deepEqual(extractConfigLines(blob), ["vless://uuid@example.com:443"]);
  assert.deepEqual(extractConfigLines(blob, { excludeWebUrls: false }), [
    "https://example.com/foo",
    "vless://uuid@example.com:443",
  ]);
});

test("strips trailing punctuation", () => {
  assert.equal(
    normalizeConfigLine("vless://uuid@example.com:443)."),
    "vless://uuid@example.com:443",
  );
});

test("builds slugs from names", () => {
  assert.equal(buildSubscriptionSlug("Jean-Luc Picard"), "jean-luc-picard");
  assert.equal(buildSubscriptionSlug("  Mom & Dad  "), "mom-dad");
  assert.equal(buildSubscriptionSlug("مسعود"), "member");
});
