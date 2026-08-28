// Shared-lab-computer fix — multi-attempt local storage layer
//
// Before this file existed, the app kept exactly ONE local pointer per exam:
//   mcq_attempt_${examId} -> { attemptId, accessToken, ... }
// On a shared lab computer, the second student's EntryForm submit blindly
// overwrote that single slot, orphaning the first student's in-progress
// attempt on that browser (their answers were still safe server-side, but
// the browser could no longer find/resume/submit them).
//
// The server-side data model was already correct — `attempts` has a real
// unique attempt id per (exam_id, student_phone), so two different students
// never collide in the database. This file just brings the *client-side*
// pointer up to the same standard: instead of one slot per exam, we keep a
// small collection of slots per exam, keyed by attemptId, so every student's
// pointer coexists independently on the same browser.
//
// Ownership/ambiguity is resolved by carrying the attemptId in the page URL
// (?a=<attemptId>) from the moment an attempt is created/resumed — see
// EntryForm.tsx and app/(public)/exam/[examId]/page.tsx. localStorage here is
// only the durable backing store so a refresh doesn't lose the pointer.
import { safeStorage } from "./safeStorage";

export interface StoredAttempt {
  attemptId: string;
  accessToken: string;
  // Only present for attempts created/resumed through EntryForm (i.e. ones
  // that can actually be used to take/resume the exam). Result-lookup
  // writes (ResultLookup.tsx, phone+name search on another device) only
  // have attemptId+accessToken, which is enough to view a result but not
  // enough to resume an in-progress exam.
  startedAt?: string;
  durationMinutes?: number;
  studentName?: string;
}

type AttemptMap = Record<string, StoredAttempt>;

function collectionKey(examId: string): string {
  return `mcq_attempts_${examId}`;
}

// Pre-fix single-slot key. Kept only so a student who was mid-exam at the
// moment this fix deployed doesn't get silently logged out — see loadAttempts.
function legacyKey(examId: string): string {
  return `mcq_attempt_${examId}`;
}

function isValid(v: unknown): v is StoredAttempt {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return typeof a.attemptId === "string" && a.attemptId.length > 0 && typeof a.accessToken === "string";
}

function hasExamSession(a: StoredAttempt): boolean {
  return typeof a.startedAt === "string" && typeof a.durationMinutes === "number";
}

// Reads the full multi-attempt collection for an exam. Never throws —
// missing keys, corrupted JSON, and malformed entries all safely resolve to
// an empty (or partially-filtered) map instead of crashing the exam.
export function loadAttempts(examId: string): AttemptMap {
  const raw = safeStorage.getJSON<Record<string, unknown>>(collectionKey(examId), {});
  const clean: AttemptMap = {};
  for (const [id, value] of Object.entries(raw ?? {})) {
    if (isValid(value) && value.attemptId === id) clean[id] = value;
  }

  // One-time migration: a browser with data from before this fix has (at
  // most) one attempt stashed under the old singular key. Fold it into the
  // collection as a normal entry instead of discarding it, then retire the
  // old key so it isn't re-migrated/re-overwritten on every future load.
  const legacy = safeStorage.getJSON<unknown>(legacyKey(examId), null);
  if (legacy != null) {
    if (isValid(legacy) && !clean[legacy.attemptId]) {
      clean[legacy.attemptId] = legacy;
      safeStorage.setJSON(collectionKey(examId), clean);
    }
    safeStorage.remove(legacyKey(examId));
  }

  return clean;
}

// Looks up one specific attempt by id. This is the normal, unambiguous path
// once a tab has an attemptId (from the URL) — it never looks at anyone
// else's entry, so it can't collide with what another student on the same
// browser is doing.
export function getAttempt(examId: string, attemptId: string): StoredAttempt | null {
  if (!attemptId) return null;
  return loadAttempts(examId)[attemptId] ?? null;
}

// Adds/updates exactly one attempt's entry, preserving every other entry in
// the collection. This — replacing "overwrite the one slot" with "merge into
// the collection" — is the actual overwrite-bug fix.
export function saveAttempt(examId: string, attempt: StoredAttempt): void {
  const all = loadAttempts(examId);
  all[attempt.attemptId] = attempt;
  safeStorage.setJSON(collectionKey(examId), all);
}

// Patches fields on an existing entry (e.g. swapping in a fresh access token
// after submit) without touching any other student's entry. No-ops if the
// entry doesn't exist yet, rather than creating a half-populated one.
export function updateAttempt(examId: string, attemptId: string, patch: Partial<StoredAttempt>): void {
  const all = loadAttempts(examId);
  const existing = all[attemptId];
  if (!existing) return;
  all[attemptId] = { ...existing, ...patch, attemptId };
  safeStorage.setJSON(collectionKey(examId), all);
}

// Fallback for tabs that land on the exam page with no ?a= in the URL (old
// bookmark/link from before this fix). Only safe to auto-resume when there
// is exactly one *resumable* (has startedAt/durationMinutes) candidate on
// this browser — with two or more it's genuinely ambiguous which student
// this tab belongs to, and guessing wrong would show one student's exam to
// another. Callers should send the student back through the entry form
// (which re-establishes identity via phone+name) whenever this returns null.
export function singleUnambiguousAttempt(examId: string): StoredAttempt | null {
  const candidates = Object.values(loadAttempts(examId)).filter(hasExamSession);
  return candidates.length === 1 ? candidates[0] : null;
}
