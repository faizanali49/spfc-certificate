// src/utils/cnicUtils.js
//
// NOTE: As currently wired up in firestoreService.js, CNIC is stored
// in PLAIN TEXT in Firestore and shown as-is on the public verify page.
// The encrypt/decrypt functions below are kept available but unused —
// re-introduce them in firestoreService.js if encryption is needed later.

const getKey = async () => {
  const rawKey = import.meta.env.VITE_CNIC_ENCRYPT_KEY || "default-dev-key-change-in-prod";
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
};

export const encryptCnic = async (cnic) => {
  try {
    const key = await getKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(cnic)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    return ""; // Fail silently — log in production
  }
};

export const decryptCnic = async (encryptedBase64) => {
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
};

// Mask CNIC for public display: 12345-6789012-3 → XXXXX-XXXXXXX-X
export const maskCnic = (cnic) => {
  if (!cnic) return "XXXXX-XXXXXXX-X";
  const digits = cnic.replace(/\D/g, "");
  if (digits.length !== 13) return "XXXXX-XXXXXXX-X";
  return "XXXXX-XXXXXXX-X";
};

// Validate CNIC format: 12345-6789012-3
export const validateCnicFormat = (cnic) => {
  return /^\d{5}-\d{7}-\d{1}$/.test(cnic);
};

// Auto-formats raw digits as the user types into XXXXX-XXXXXXX-X.
// Strips any non-digit characters first, then inserts dashes at the
// correct positions, capped at 13 digits total.
export const formatCnicInput = (rawValue) => {
  const digits = rawValue.replace(/\D/g, "").slice(0, 13);

  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};
