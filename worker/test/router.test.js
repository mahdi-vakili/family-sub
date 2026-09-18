import test from "node:test";
import assert from "node:assert/strict";

import { matchRoute, register } from "../src/router.js";

register("GET", "/things", () => "list");
register("POST", "/things", () => "create");
register("GET", "/things/:id", (_ctx, params) => `thing ${params.id}`);
register("GET", "/things/:id/edit", (_ctx, params) => `edit ${params.id}`);

test("matches a static route", () => {
  assert.equal(matchRoute("GET", "/things").handler(), "list");
});

test("matches by method", () => {
  assert.equal(matchRoute("POST", "/things").handler(), "create");
});

test("captures path params", () => {
  const route = matchRoute("GET", "/things/42");
  assert.equal(route.handler(null, route.params), "thing 42");
});

test("prefers the longest matching pattern length", () => {
  const route = matchRoute("GET", "/things/42/edit");
  assert.equal(route.handler(null, route.params), "edit 42");
});

test("returns null for unknown paths", () => {
  assert.equal(matchRoute("GET", "/missing"), null);
});
