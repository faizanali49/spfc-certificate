// src/utils/generateCertId.js
import { collection, getDocs, query, where } from "firebase/firestore";

const CHARS = "0123456789"; // No I, O, 0, 1 — avoids confusion
const PREFIX = "GJT";

const randomSegment = (length) =>
  Array.from({ length }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");

export const generateUniqueCertId = async (db) => {
  let isUnique = false;
  let certId = "";

  while (!isUnique) {
    certId = `${PREFIX}-${randomSegment(8)}`;
    const q = query(collection(db, "certificates"), where("cert_id", "==", certId));
    const snap = await getDocs(q);
    if (snap.empty) isUnique = true;
  }

  return certId;
};
