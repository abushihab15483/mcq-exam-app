// Production-safe wrapper around window.localStorage.
//
// Why this exists: raw `localStorage.getItem/setItem/removeItem` calls can throw
// (Safari Private Browsing, kiosk/school browsers with storage disabled, full
// storage → QuotaExceededError, cross-origin iframe restrictions → SecurityError),
// and raw `JSON.parse` on stored data can throw on corrupted or old-schema values.
// None of that is allowed to crash the exam UI — every read/write here is wrapped
// so callers always get a value back (never a thrown exception) and the app
// transparently falls back to an in-memory store for the current page session.
//
// Important: `typeof window !== "undefined" && window.localStorage` is NOT enough —
// some browsers expose the object but throw the moment you call getItem/setItem on
// it. This module actually performs a real read/write probe instead of just
// checking existence.
//
// Persistence note: the in-memory fallback only lives for the current page
// session. If localStorage is unavailable, data will NOT survive a full page
// refresh — that's an inherent limitation, not a bug, and callers should not
// assume otherwise.

type StorageStatus = "unknown" | "available" | "unavailable";
type StatusListener = (status: StorageStatus) => void;

// In-memory fallback store. Kept in sync on every successful `set`, regardless
// of whether localStorage itself is currently available, so a mid-session
// failure (e.g. quota exceeded partway through) doesn't lose the value.
const memoryStore = new Map<string, string>();

let status: StorageStatus = "unknown";
const listeners = new Set<StatusListener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn("[safeStorage]", ...args);
  }
}

function setStatus(next: StorageStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // a subscriber throwing must never break storage itself
    }
  });
}

// Real read/write/remove roundtrip — not just a `typeof` check — because some
// browsers expose `window.localStorage` but throw on actual use.
function probe(): boolean {
  if (!isBrowser()) return false;
  try {
    const testKey = "__safeStorage_probe__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getItem(key: string): string | null {
  if (isBrowser()) {
    try {
      const value = window.localStorage.getItem(key);
      setStatus("available");
      return value;
    } catch (err) {
      devWarn("getItem failed, using memory fallback:", key, err);
      setStatus("unavailable");
    }
  }
  return memoryStore.has(key) ? (memoryStore.get(key) as string) : null;
}

function setItem(key: string, value: string): boolean {
  // Always keep the memory copy current so a failure mid-session (e.g.
  // QuotaExceededError on write #50) doesn't lose data written before it.
  memoryStore.set(key, value);

  if (isBrowser()) {
    try {
      window.localStorage.setItem(key, value);
      setStatus("available");
      return true;
    } catch (err) {
      // Covers QuotaExceededError, SecurityError, and any other DOMException.
      devWarn("setItem failed, using memory fallback:", key, err);
      setStatus("unavailable");
      return false;
    }
  }
  return false;
}

function removeItem(key: string): void {
  memoryStore.delete(key);
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(key);
      setStatus("available");
    } catch (err) {
      devWarn("removeItem failed:", key, err);
      setStatus("unavailable");
    }
  }
}

// Safe JSON read. Corrupted JSON, wrong types, and old-schema values never
// throw — the bad value is dropped and `fallback` is returned instead.
function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    devWarn("corrupted JSON for key, clearing:", key, err);
    removeItem(key);
    return fallback;
  }
}

function setJSON<T>(key: string, value: T): boolean {
  try {
    const raw = JSON.stringify(value);
    return setItem(key, raw);
  } catch (err) {
    devWarn("failed to stringify value for key:", key, err);
    return false;
  }
}

function isPersistent(): boolean {
  return status === "available";
}

function getStatus(): StorageStatus {
  return status;
}

// Lets React components (e.g. a non-blocking warning banner) react when
// storage flips from available → unavailable (or the reverse) without
// polling. Returns an unsubscribe function.
function subscribe(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Resolve initial status once, on the client, at module load. Stays
// "unknown" during SSR — callers should treat "unknown" the same as
// "available" for rendering purposes (no warning shown yet) since the first
// real getItem/setItem call will resolve it immediately after hydration.
if (isBrowser()) {
  setStatus(probe() ? "available" : "unavailable");
}

export const safeStorage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
  getJSON,
  setJSON,
  isPersistent,
  getStatus,
  subscribe,
};

export type { StorageStatus };
