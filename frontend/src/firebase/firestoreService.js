// src/firebase/firestoreService.js
//
// COST-OPTIMIZATION STRATEGY (v2 — paginated):
//
// 1. CNIC AS DOCUMENT ID
//    Certificates are stored with the CNIC itself as the Firestore document
//    ID (dashes stripped, e.g. "3520112345671"). This makes public
//    verification AND admin CNIC search a direct getDoc() — the cheapest
//    possible read, 1 read no matter how many total records exist.
//
// 2. SERVER-SIDE PAGINATION FOR THE DASHBOARD LIST
//    fetchCertificatesPage() only ever reads PAGE_SIZE documents at a time,
//    using a startAfter() cursor. Opening the dashboard, or clicking
//    Next/Previous, costs PAGE_SIZE reads — NOT the whole collection —
//    regardless of whether you have 100 or 100,000 records.
//
// 3. AGGREGATION QUERIES FOR METRICS
//    Total / incomplete / recent-this-week counts use getCountFromServer(),
//    which is billed as a flat 1 read per query, NOT 1 read per document.
//
// 4. SHORT-LIVED PAGE CACHE
//    Each fetched page is cached in memory + sessionStorage, keyed by its
//    page params. Revisiting the same page (e.g. clicking Back) in the same
//    tab costs zero reads. A refresh (F5) restores from sessionStorage
//    instead of re-reading Firestore. Any add/edit/delete clears all of it,
//    since cursors and page contents are no longer guaranteed correct.

import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { generateCertId } from "../utils/generateCertId";
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheInvalidatePrefix,
  cacheClearAll,
} from "./cache";

export const PAGE_SIZE = 20;

// Normalizes a CNIC into a safe, consistent Firestore document ID:
// strips dashes/spaces so "12345-6789012-3" -> "1234567890123"
export const cnicToDocId = (cnic) => (cnic || "").replace(/[^0-9]/g, "");

// ── CERTIFICATES — PAGINATED LIST ───────────────────────────────
//
// cursorStack: array of the LAST DOCUMENT SNAPSHOT of every page already
// visited, e.g. [page1LastDoc, page2LastDoc, ...]. The Dashboard hook owns
// this stack; this function just needs "the cursor to start after" (or null
// for page 1) plus an optional city filter.
//
// Returns: { rows, lastDoc, hasMore }
export const fetchCertificatesPage = async ({
  cursor = null,
  city = "",
  force = false,
} = {}) => {
  const cacheKey = `certs:page:${city || "all"}:${cursor ? cursor.id : "first"}`;

  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const clauses = [collection(db, "certificates")];
  if (city) clauses.push(where("city", "==", city));
  clauses.push(orderBy("created_at", "desc"));
  if (cursor) clauses.push(startAfter(cursor));
  clauses.push(limit(PAGE_SIZE + 1)); // fetch one extra to know if there's a next page

  const q = query(...clauses);
  const snap = await getDocs(q);

  const docs = snap.docs.slice(0, PAGE_SIZE);
  const hasMore = snap.docs.length > PAGE_SIZE;
  const rows = docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = docs.length ? docs[docs.length - 1] : null;

  const result = { rows, lastDoc, hasMore };
  return cacheSet(cacheKey, result);
};

// ── METRICS — AGGREGATION QUERIES (1 read each, not 1-per-doc) ──
//
// NOTE: getCountFromServer with a where() clause on a boolean-ish derived
// field (like "incomplete") isn't possible directly since that field
// doesn't exist in Firestore — it's computed client-side from 3 fields.
// We approximate it cheaply: total + recent are true aggregations (1 read
// each); "incomplete" is intentionally left as a page-scoped count on the
// Dashboard (computed from whatever page is loaded) rather than a full-scan,
// OR you can remove it from the metrics row entirely. See Dashboard.jsx.
export const fetchCertificateMetrics = async ({ force = false } = {}) => {
  const cacheKey = "certs:metrics";
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const colRef = collection(db, "certificates");

  const totalSnap = await getCountFromServer(query(colRef));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSnap = await getCountFromServer(
    query(colRef, where("created_at", ">=", sevenDaysAgo))
  );

  const result = {
    total: totalSnap.data().count,
    recentCount: recentSnap.data().count,
  };
  return cacheSet(cacheKey, result);
};

// ── CNIC EXACT-MATCH SEARCH (the only search the admin needs) ──
//
// Document ID IS the CNIC, so this is a single getDoc() — 1 read,
// independent of total collection size. Same cost as public verification.
export const searchCertificateByCnic = async (cnic) => {
  const cnicDocId = cnicToDocId(cnic);
  if (!cnicDocId) return null;

  const cacheKey = `certificate:cnic:${cnicDocId}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const snap = await getDoc(doc(db, "certificates", cnicDocId));
  if (!snap.exists()) return cacheSet(cacheKey, null);

  const result = { id: snap.id, ...snap.data() };
  return cacheSet(cacheKey, result);
};

// ── WRITES ───────────────────────────────────────────────────────

export const saveCertificate = async (formData, photoUrl = null) => {
  const cnicDocId = cnicToDocId(formData.cnic);
  if (!cnicDocId) throw new Error("A valid CNIC is required to save a certificate.");

  // No Firestore read needed to generate this — see generateCertId.js.
  const cert_id = generateCertId();

  const payload = {
    ...formData,
    cert_id,
    student_photo_url: photoUrl,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  // setDoc with an explicit ID (the CNIC) instead of addDoc — this is what
  // makes public verification AND admin CNIC search a direct, cheap getDoc().
  await setDoc(doc(db, "certificates", cnicDocId), payload);

  // Page cursors/contents and metrics are no longer guaranteed accurate —
  // clear everything certificate-related rather than guessing what changed.
  cacheInvalidatePrefix("certs:page:");
  cacheInvalidate("certs:metrics");
  cacheInvalidate(`certificate:cnic:${cnicDocId}`);

  return { docId: cnicDocId, cert_id };
};

export const updateCertificate = async (docId, formData, photoUrl) => {
  const ref = doc(db, "certificates", docId);

  const updates = { ...formData, updated_at: serverTimestamp() };
  if (photoUrl) updates.student_photo_url = photoUrl;

  await updateDoc(ref, updates);

  cacheInvalidatePrefix("certs:page:");
  cacheInvalidate("certs:metrics");
  cacheInvalidate(`certificate:cnic:${docId}`);
};

export const deleteCertificate = async (docId) => {
  await deleteDoc(doc(db, "certificates", docId));

  cacheInvalidatePrefix("certs:page:");
  cacheInvalidate("certs:metrics");
  cacheInvalidate(`certificate:cnic:${docId}`);
};

// Used by the EditCertificate admin page. Not cached deliberately —
// edit pages should always reflect the latest saved data.
export const getCertificateById = async (docId) => {
  const snap = await getDoc(doc(db, "certificates", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ── PUBLIC VERIFICATION BY CNIC ─────────────────────────────────
// Unchanged — already optimal. Direct getDoc by CNIC, cached per-CNIC.
export const verifyCertificateByCnic = async (cnic) => {
  const cnicDocId = cnicToDocId(cnic);
  const cacheKey = `certificate:cnic:${cnicDocId}`;

  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const snap = await getDoc(doc(db, "certificates", cnicDocId));
  if (!snap.exists()) return cacheSet(cacheKey, null);

  const result = { id: snap.id, ...snap.data() };
  return cacheSet(cacheKey, result);
};

// ── DROPDOWN LISTS (Purposes, Purpose of Obtaining, Cities) ────
// Unchanged — already cheap and correctly scoped. Each list_type is its
// own cache entry; touching one never invalidates the others or the
// certificates cache.

const dropdownCacheKey = (listType) => `dropdown_list:${listType}`;

export const fetchDropdownList = async (listType, { force = false } = {}) => {
  const cacheKey = dropdownCacheKey(listType);
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const q = query(
    collection(db, "dropdown_lists"),
    where("list_type", "==", listType),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cacheSet(cacheKey, data);
};

export const addDropdownItem = async (listType, label) => {
  const existing = cacheGet(dropdownCacheKey(listType)) || (await fetchDropdownList(listType));
  const order = existing.length + 1;

  await addDoc(collection(db, "dropdown_lists"), { list_type: listType, label, order });

  cacheInvalidate(dropdownCacheKey(listType));
};

export const updateDropdownItem = async (docId, newLabel, listType) => {
  await updateDoc(doc(db, "dropdown_lists", docId), { label: newLabel });
  if (listType) cacheInvalidate(dropdownCacheKey(listType));
  else cacheInvalidatePrefix("dropdown_list:");
};

export const deleteDropdownItem = async (docId, listType) => {
  await deleteDoc(doc(db, "dropdown_lists", docId));
  if (listType) cacheInvalidate(dropdownCacheKey(listType));
  else cacheInvalidatePrefix("dropdown_list:");
};

// ── Legacy purpose functions (kept for backward compatibility) ──
export const fetchPurposes = () => fetchDropdownList("purpose");
export const addPurpose = (label) => addDropdownItem("purpose", label);
export const deletePurpose = (docId) => deleteDropdownItem(docId, "purpose");