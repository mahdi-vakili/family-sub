import test from "node:test";
import assert from "node:assert/strict";

import { parseSession, serializeSession } from "../src/session.js";

const SECRET = "test-secret-key";

test("round-trips a session", async () => {
  const session = { uid: 1, username: "admin", csrf: "abc", flash: [] };
  const token = await serializeSession(session, SECRET);
  const parsed = await parseSession(token, SECRET);
  assert.deepEqual(parsed, session);
});

test("rejects a tampered token", async () => {
  const token = await serializeSession({ uid: 1 }, SECRET);
  const tampered = `${token.slice(0, -2)}xx`;
  assert.equal(await parseSession(tampered, SECRET), null);
});

test("rejects a token signed with a different secret", async () => {
  const token = await serializeSession({ uid: 1 }, SECRET);
  assert.equal(await parseSession(token, "other-secret"), null);
});

test("rejects an expired session", async () => {
  const token = await serializeSession({ uid: 1, expiresAt: Date.now() - 1000 }, SECRET);
  assert.equal(await parseSession(token, SECRET), null);
});

test("rejects empty or malformed tokens", async () => {
  assert.equal(await parseSession("", SECRET), null);
  assert.equal(await parseSession("no-dot", SECRET), null);
});
