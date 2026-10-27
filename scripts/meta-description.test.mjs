import assert from "node:assert/strict";
import test from "node:test";
import { metaDescription } from "./meta-description.mjs";

test("preserves English apostrophes in double-quoted descriptions", () => {
  const description = "Registered on TMGM's own website without an agent link? Within 3 days of registering, submit only your registered email to apply for rebates. No account number, password or ID needed.";
  assert.equal(metaDescription(`<meta name="description" content="${description}">`), description);
});

test("preserves double quotes inside single-quoted descriptions", () => {
  assert.equal(metaDescription(`<meta name='description' content='Read the "account type" field.'>`), 'Read the "account type" field.');
});

test("does not consume the next tag and preserves Chinese and entities", () => {
  assert.equal(metaDescription('<meta name="description" content="中英说明 &amp; FAQ"><meta name="other" content="next">'), "中英说明 &amp; FAQ");
});

test("missing or empty descriptions remain empty", () => {
  assert.equal(metaDescription('<meta name="description" content="">'), "");
  assert.equal(metaDescription('<title>Example</title>'), "");
});
