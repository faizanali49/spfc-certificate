// src/firebase/config.js
// Replace all values below with your actual Firebase project credentials
// Get them from: Firebase Console → Project Settings → Your Apps → SDK setup
//
// NOTE: Firebase Storage is intentionally NOT initialized here. Applicant
// photos are uploaded to our own photo-server instead (see storageService.js
// and ../photo-server in this project) to avoid Firebase Storage's 5GB
// free-tier limit.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
