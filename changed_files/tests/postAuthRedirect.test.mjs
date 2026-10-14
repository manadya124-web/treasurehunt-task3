// Run with:  node --experimental-strip-types --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { getSafeRedirectPath, withNext } from "../lib/postAuthRedirect.ts";

test("accepts valid internal paths and keeps query/hash", () => {
  assert.equal(getSafeRedirectPath("/events/treasurehunt"), "/events/treasurehunt");
  assert.equal(getSafeRedirectPath("/events/treasurehunt/game?teamId=abc"), "/events/treasurehunt/game?teamId=abc");
  assert.equal(getSafeRedirectPath("/a?x=1#frag"), "/a?x=1#frag");
  assert.equal(getSafeRedirectPath("/"), "/");
});

test("rejects missing values", () => {
  for (const v of [null, undefined, "", "   "]) assert.equal(getSafeRedirectPath(v), null);
});

test("rejects external / protocol-relative / scheme URLs", () => {
  for (const v of [
    "https://evil.com", "http://evil.com/x", "//evil.com", "///evil.com",
    "evil.com", "javascript:alert(1)", "data:text/html,hi", "events/treasurehunt",
  ]) assert.equal(getSafeRedirectPath(v), null, v);
});

test("rejects backslash, whitespace and control-char tricks", () => {
  for (const v of ["/\\evil.com", "\\\\evil.com", "/\\/evil.com", "/\t/evil.com", "/\n/evil.com", "/a b", "/a\u0000b"])
    assert.equal(getSafeRedirectPath(v), null, JSON.stringify(v));
});

test("rejects auth pages (prevents redirect loops)", () => {
  for (const v of ["/auth/login", "/auth/login?next=%2Fx", "/auth/signup", "/auth/verify-email"])
    assert.equal(getSafeRedirectPath(v), null, v);
  assert.equal(getSafeRedirectPath("/auth/forgot-password"), "/auth/forgot-password");
});

test("rejects overly long input", () => {
  assert.equal(getSafeRedirectPath("/" + "a".repeat(3000)), null);
});

test("withNext only appends safe destinations", () => {
  assert.equal(withNext("/auth/login", "/events/treasurehunt"), "/auth/login?next=%2Fevents%2Ftreasurehunt");
  assert.equal(withNext("/auth/login", "https://evil.com"), "/auth/login");
  assert.equal(withNext("/auth/signup", null), "/auth/signup");
});
