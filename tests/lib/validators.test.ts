// Regression tests for examSchema (Fix #11 — exam time sanity validation).
//
// Run with: node --experimental-strip-types --test tests/
//
// These cover the cross-field rules between start_time, end_time, and
// duration_minutes that examSchema (lib/validators.ts) enforces — the same
// schema used by ExamForm.tsx (client) and both app/api/exams routes
// (create + update), so a single passing test suite here covers all three.

import { test } from "node:test";
import assert from "node:assert/strict";
import { examSchema } from "../../lib/validators.ts";

const base = {
  title: "টেস্ট পরীক্ষা",
  status: "published" as const,
};

function check(overrides: Partial<Record<string, unknown>>) {
  return examSchema.safeParse({ ...base, ...overrides });
}

test("valid: duration exactly fills the window (30/30)", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:30:00Z", duration_minutes: 30 });
  assert.equal(r.success, true);
});

test("valid: duration smaller than the window (60/60)", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z", duration_minutes: 60 });
  assert.equal(r.success, true);
});

test("invalid: duration 1 minute more than the window", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:30:00Z", duration_minutes: 31 });
  assert.equal(r.success, false);
  assert.equal(r.error?.issues[0]?.path[0], "duration_minutes");
});

test("invalid: duration double the window", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:30:00Z", duration_minutes: 60 });
  assert.equal(r.success, false);
});

test("invalid: start_time equals end_time (zero-width window)", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:00:00Z", duration_minutes: 30 });
  assert.equal(r.success, false);
  assert.equal(r.error?.issues[0]?.path[0], "end_time");
});

test("invalid: end_time before start_time", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T09:59:00Z", duration_minutes: 30 });
  assert.equal(r.success, false);
  assert.equal(r.error?.issues[0]?.path[0], "end_time");
});

test("invalid: malformed start_time", () => {
  const r = check({ start_time: "not-a-date", end_time: "2026-01-01T10:30:00Z", duration_minutes: 30 });
  assert.equal(r.success, false);
});

test("invalid: malformed end_time", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "not-a-date", duration_minutes: 30 });
  assert.equal(r.success, false);
});

test("invalid: missing start_time", () => {
  const r = check({ start_time: "", end_time: "2026-01-01T10:30:00Z", duration_minutes: 30 });
  assert.equal(r.success, false);
});

test("invalid: missing end_time", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "", duration_minutes: 30 });
  assert.equal(r.success, false);
});

test("invalid: non-integer duration", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z", duration_minutes: 30.5 });
  assert.equal(r.success, false);
});

test("invalid: negative duration", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z", duration_minutes: -10 });
  assert.equal(r.success, false);
});

test("invalid: zero duration", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:00:00Z", duration_minutes: 0 });
  assert.equal(r.success, false);
});

test("invalid: duration far larger than the window", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:05:00Z", duration_minutes: 500 });
  assert.equal(r.success, false);
});

test("valid: existing exam update payload continues to pass", () => {
  const r = check({ start_time: "2026-02-10T04:00:00.000Z", end_time: "2026-02-10T06:00:00.000Z", duration_minutes: 45 });
  assert.equal(r.success, true);
});

// Sub-minute precision (seconds) in stored timestamps shouldn't break the comparison —
// window is 30.5 minutes here, so a 30-minute duration must still be valid.
test("valid: window with seconds precision, duration fits inside it", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:30:30Z", duration_minutes: 30 });
  assert.equal(r.success, true);
});

test("invalid: window with seconds precision, duration exceeds it by using the rounded-down minute", () => {
  const r = check({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T10:30:30Z", duration_minutes: 31 });
  assert.equal(r.success, false);
});

test("invalid: title missing/too short still rejected (unrelated rule preserved)", () => {
  const r = check({ title: "A", start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z", duration_minutes: 30 });
  assert.equal(r.success, false);
});
