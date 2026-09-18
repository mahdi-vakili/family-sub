import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, verifyPassword } from "../src/passwords.js";

test("verifies a correct password", async () => {
  const stored = await hashPassword("correct horse battery staple", 1000);
  assert.equal(await verifyPassword(stored, "correct horse battery staple"), true);
  assert.equal(await verifyPassword(stored, "wrong password"), false);
});

test("rejects malformed stored hashes", async () => {
  assert.equal(await verifyPassword("not-a-hash", "anything"), false);
  assert.equal(await verifyPassword("pbkdf2_sha256$abc$zz$zz", "anything"), false);
});

test("salts are unique per hash", async () => {
  const first = await hashPassword("same-password", 1000);
  const second = await hashPassword("same-password", 1000);
  assert.notEqual(first, second);
});
