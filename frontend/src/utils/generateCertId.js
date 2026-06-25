// src/utils/generateCertId.js
//
// Generates a display certificate ID with ZERO Firestore reads.
//
// OLD BEHAVIOR (removed): queried Firestore with
// where("cert_id","==",candidate) and retried on collision — this added one
// full query read to EVERY single certificate save, silently, forever.
//
// NEW BEHAVIOR: timestamp + random suffix. Collision probability is
// astronomically low (timestamp gives per-millisecond uniqueness already;
// the random suffix is just extra safety margin), and this ID is a DISPLAY
// label only — it is never used to look up records. Actual lookups use the
// CNIC (the real document ID). See cnicToDocId() in firestoreService.js.

const CHARS = "0123456789"; // No I, O, 0, 1 confusion since digits-only
const PREFIX = "GJT";

const randomSegment = (length) =>
  Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");

export const generateCertId = () => {
  // Base-36 timestamp keeps it shortish while still being effectively
  // unique per millisecond. Combined with a random segment as a safety
  // margin against clock-resolution edge cases or multiple admins saving
  // in the same millisecond.
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = randomSegment(4);
  return `${PREFIX}-${timePart}-${randomPart}`;
};

// Kept for backward compatibility with any old import sites — now a no-op
// wrapper with the same signature, but truly synchronous and read-free.
// (db argument is intentionally ignored.)
export const generateUniqueCertId = async (_db) => generateCertId();