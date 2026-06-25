// src/firebase/cache.js
//
// In-memory + sessionStorage cache to minimize Firestore reads.
//
// HOW IT WORKS:
// - Data is fetched once and stored both in a JS Map (fast, this render)
//   AND in sessionStorage (survives an F5 refresh of the SAME tab).
// - Closing the tab clears sessionStorage automatically (that's what
//   "session" storage means) — which is fine, since a brand new tab is a
//   legitimate fresh start anyway.
// - Cache entries are invalidated (cleared) only when data actually
//   changes — right after addDoc / updateDoc / deleteDoc calls in
//   firestoreService.js.
//
// WHY NOT localStorage: localStorage persists forever across all tabs and
// browser restarts, which means stale data could silently survive for days.
// sessionStorage's "dies when tab closes" behavior is the safer default for
// data that changes via admin actions.

const STORAGE_PREFIX = "spfc_cache:";
const store = new Map();

const readFromSession = (key) => {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const writeToSession = (key, value) => {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // sessionStorage can throw if full or unavailable (e.g. private mode) —
    // the in-memory Map still works, so this is safe to ignore.
  }
};

const removeFromSession = (key) => {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
};

export const cacheGet = (key) => {
  if (store.has(key)) return store.get(key);

  const fromSession = readFromSession(key);
  if (fromSession !== undefined) {
    store.set(key, fromSession); // warm the in-memory map too
    return fromSession;
  }
  return undefined;
};

export const cacheSet = (key, value) => {
  store.set(key, value);
  writeToSession(key, value);
  return value;
};

export const cacheInvalidate = (key) => {
  store.delete(key);
  removeFromSession(key);
};

// Invalidate all keys starting with a given prefix (checks both the live
// Map and sessionStorage, since a page-cache key might exist in one but
// not the other depending on refresh timing).
export const cacheInvalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const fullKey = sessionStorage.key(i);
      if (fullKey && fullKey.startsWith(STORAGE_PREFIX + prefix)) {
        toRemove.push(fullKey);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
};

export const cacheClearAll = () => {
  store.clear();
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const fullKey = sessionStorage.key(i);
      if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) toRemove.push(fullKey);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
};