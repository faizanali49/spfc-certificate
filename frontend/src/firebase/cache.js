// src/firebase/cache.js
//
// Simple in-memory cache to minimize Firestore reads (and therefore cost).
//
// HOW IT WORKS:
// - Data is fetched ONCE and stored here for the lifetime of the browser tab.
// - Subsequent calls return the cached value instantly — NO Firestore read.
// - Cache is invalidated (cleared) only when data actually changes:
//   right after addDoc / updateDoc / deleteDoc calls in firestoreService.js.
// - This means: opening Dashboard, navigating away, and coming back does NOT
//   re-fetch from Firestore — only an actual add/edit/delete triggers a refetch.
//
// NOTE: This cache lives in memory only. Refreshing the browser tab (F5)
// clears it, which is intentional and safe — the next load just fetches once.

const store = new Map();

export const cacheGet = (key) => store.get(key);

export const cacheSet = (key, value) => {
  store.set(key, value);
  return value;
};

export const cacheInvalidate = (key) => {
  store.delete(key);
};

// Invalidate all keys starting with a given prefix.
// Useful for clearing all dropdown-list caches at once, for example.
export const cacheInvalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

export const cacheClearAll = () => store.clear();
