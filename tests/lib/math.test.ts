// Regression tests for lib/math.ts (Issue #10 — MathJax CDN fallback).
//
// Run with: node --experimental-strip-types --test tests/
// (Node 22.6+ can type-strip .ts files directly; no extra test-framework
// dependency was added to the project for this — see final report.)
//
// These cover the two pure helpers MathRenderer relies on:
//   - hasMathContent: decides whether MathJax is even attempted
//   - plainMathFallback: what students see when it isn't available
// Both must be deterministic and never throw, since they run on the
// fallback path itself — this is the safety net, it can't have its own bugs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { hasMathContent, hasAnyMathContent, plainMathFallback } from "../../lib/math.ts";

test("hasMathContent: detects inline $...$ math", () => {
  assert.equal(hasMathContent("x^2 + y^2 = $z^2$"), true);
  assert.equal(hasMathContent("$\\frac{1}{2}$"), true);
});

test("hasMathContent: plain text with no math returns false", () => {
  assert.equal(hasMathContent("ঢাকা বাংলাদেশের রাজধানী।"), false);
  assert.equal(hasMathContent("A simple option with no formula"), false);
  assert.equal(hasMathContent(""), false);
});

test("hasMathContent: a single lone $ (no closing pair) is not math", () => {
  assert.equal(hasMathContent("Price is $5 only"), false);
});

test("hasMathContent: never throws on unusual input", () => {
  assert.doesNotThrow(() => hasMathContent("$$$$$$"));
  assert.doesNotThrow(() => hasMathContent("\\ malformed { latex"));
});

test("plainMathFallback: strips $ delimiters, keeps content readable", () => {
  assert.equal(plainMathFallback("$x^2 + y^2 = z^2$"), "x^2 + y^2 = z^2");
});

test("plainMathFallback: text without $ is returned unchanged", () => {
  assert.equal(plainMathFallback("no math here"), "no math here");
});

test("plainMathFallback: empty string stays empty", () => {
  assert.equal(plainMathFallback(""), "");
});

test("plainMathFallback: never throws on malformed/unsupported LaTeX", () => {
  assert.doesNotThrow(() => plainMathFallback("$\\frac{1}{$broken"));
  assert.equal(plainMathFallback("$\\frac{1}{$broken"), "\\frac{1}{broken");
});

// hasAnyMathContent — decides whether an entire exam needs MathJax loaded at
// all (used once per exam page, not per-question).
test("hasAnyMathContent: false when nothing in the list has math", () => {
  assert.equal(hasAnyMathContent(["plain question", "option a", "option b"]), false);
});

test("hasAnyMathContent: true when even one item has math", () => {
  assert.equal(hasAnyMathContent(["plain question", "$x^2$", "option b"]), true);
});

test("hasAnyMathContent: empty list is false", () => {
  assert.equal(hasAnyMathContent([]), false);
});

test("hasAnyMathContent: tolerates null/undefined entries (optional question fields)", () => {
  assert.doesNotThrow(() => hasAnyMathContent([null, undefined, "text"]));
  assert.equal(hasAnyMathContent([null, undefined, "text"]), false);
  assert.equal(hasAnyMathContent([null, "$a$", undefined]), true);
});
