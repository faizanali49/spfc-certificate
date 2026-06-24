// src/firebase/firestoreService.js
//
// COST-OPTIMIZATION STRATEGY:
//
// 1. CNIC AS DOCUMENT ID
//    Certificates are stored with the CNIC itself as the Firestore document
//    ID (dashes stripped, e.g. "3520112345671"). This makes public
//    verification a direct getDoc() — the cheapest, fastest possible read
//    in Firestore. There is NO query, NO index scan, and performance is
//    identical whether you have 100 records or 1,000,000 — direct document
//    reads do not degrade with collection size.
//
// 2. IN-MEMORY CACHE (see cache.js)
//    All reads are cached in memory for the lifetime of the browser tab.
//    Repeated lookups of the same CNIC, or repeated Dashboard loads, cost
//    zero additional reads. Cache is only invalidated by actual writes
//    (add / edit / delete), so the data is always correct after a change.

import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { generateUniqueCertId } from "../utils/generateCertId";
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePrefix } from "./cache";

const CERTS_CACHE_KEY = "certificates:all";

// Normalizes a CNIC into a safe, consistent Firestore document ID:
// strips dashes/spaces so "12345-6789012-3" -> "1234567890123"
export const cnicToDocId = (cnic) => (cnic || "").replace(/[^0-9]/g, "");

// ── CERTIFICATES ──────────────────────────────────────────────

// One-time fetch of all certificates, cached until the next add/edit/delete.
// Used by the admin Dashboard only — the public verify page never calls this.
export const fetchCertificates = async ({ force = false } = {}) => {
  if (!force) {
    const cached = cacheGet(CERTS_CACHE_KEY);
    if (cached) return cached;
  }

  const q = query(collection(db, "certificates"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cacheSet(CERTS_CACHE_KEY, data);
};

export const saveCertificate = async (formData, photoUrl = null) => {
  const cnicDocId = cnicToDocId(formData.cnic);
  if (!cnicDocId) throw new Error("A valid CNIC is required to save a certificate.");

  const cert_id = await generateUniqueCertId(db);

  const payload = {
    ...formData,
    cert_id,
    student_photo_url: photoUrl,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  // setDoc with an explicit ID (the CNIC) instead of addDoc — this is what
  // makes public verification a direct, cheap getDoc() by CNIC later.
  await setDoc(doc(db, "certificates", cnicDocId), payload);

  cacheInvalidate(CERTS_CACHE_KEY);
  cacheInvalidate(`certificate:cnic:${cnicDocId}`);

  return { docId: cnicDocId, cert_id };
};

export const updateCertificate = async (docId, formData, photoUrl) => {
  const ref = doc(db, "certificates", docId);

  const updates = { ...formData, updated_at: serverTimestamp() };
  if (photoUrl) updates.student_photo_url = photoUrl;

  await updateDoc(ref, updates);

  cacheInvalidate(CERTS_CACHE_KEY);
  cacheInvalidate(`certificate:cnic:${docId}`);
};

export const deleteCertificate = async (docId) => {
  await deleteDoc(doc(db, "certificates", docId));

  cacheInvalidate(CERTS_CACHE_KEY);
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
//
// This is the core of the new verification flow. Because the document ID
// IS the CNIC, this is a direct getDoc() — one read, no query, no index,
// and the cost/speed is identical no matter how many total records exist.
// Each CNIC's result (found or not-found) is cached, so re-checking the
// same CNIC in the same session costs nothing further.
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
// All three dropdown types share one Firestore collection: "dropdown_lists"
// Each document has: { list_type: "purpose" | "obtain_purpose" | "city", label, order }
// These lists rarely change, so they are cached aggressively per list_type.

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
