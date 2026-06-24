// photo-server/src/server.js
//
// A minimal, standalone file server with exactly one job: store and serve
// applicant photos for the certificate system, replacing Firebase Storage.
//
// It does NOT touch Firestore, Firebase Auth, or any certificate data —
// those all keep working exactly as before. This server only ever returns
// a plain URL string, which your React app then saves into the
// `student_photo_url` field in Firestore, exactly like the old Firebase
// Storage download URL was saved before.

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4001;
const UPLOAD_DIR = path.resolve(__dirname, "..", process.env.UPLOAD_DIR || "./uploads");
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "";
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

// Ensure the upload directory exists before anything tries to write to it.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN.length > 0 ? CORS_ORIGIN : "*",
  })
);

// ── Simple shared-secret auth ──────────────────────────────────
// Your React admin panel already requires Firebase login before it ever
// calls this server. This shared secret is an extra layer so that random
// visitors on the internet can't upload/delete files even if they discover
// this server's URL — only requests carrying the correct key are accepted.
const requireUploadSecret = (req, res, next) => {
  const provided = req.header("x-upload-secret");
  if (!UPLOAD_SECRET || provided !== UPLOAD_SECRET) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
};

// ── Multer setup: save files to disk, named by cert_id ─────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Because we fixed the FormData order on the frontend, req.body.certId is now available here.
    const certId = (req.body.certId || "unknown")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    console.log("UPLOAD CERT ID:", certId);

    const extension = path.extname(file.originalname).toLowerCase() || ".jpg";
    
    // FIX: Add a unique timestamp to the filename.
    // This entirely prevents the browser from caching the old image if an admin 
    // edits a certificate and uploads a new photo for the same certId.
    const uniqueFilename = `${certId}-${Date.now()}${extension}`;

    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB — matches the frontend compression target
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// ── Routes ───────────────────────────────────────────────────────

// Health check — useful to confirm the server is up after deployment.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Upload a photo. Expects multipart/form-data with:
//   - field "certId": the certificate ID to name the file after (MUST come first)
//   - field "photo": the image file
// Returns: { url: "https://your-domain/photos/SCH-A1B2C3D4-1698765432.jpg" }
app.post("/upload", requireUploadSecret, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No photo file was provided." });
  }
  const url = `${PUBLIC_BASE_URL}/photos/${req.file.filename}`;
  res.json({ url });
});

// Delete a previously uploaded photo by its full URL.
// Expects JSON body: { url: "https://your-domain/photos/SCH-A1B2C3D4-1698765432.jpg" }
app.delete("/delete", requireUploadSecret, express.json(), (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No photo URL was provided." });
  }

  try {
    const filename = path.basename(new URL(url).pathname);
    const filePath = path.join(UPLOAD_DIR, filename);

    // Guard against path traversal — resolved path must stay inside UPLOAD_DIR.
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return res.status(400).json({ error: "Invalid file path." });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ deleted: true });
  } catch {
    // File may already be gone, or URL malformed — fail quietly,
    // matching the old Firebase deleteCertificatePhoto behavior.
    res.json({ deleted: false });
  }
});

// Serve uploaded photos as static files at /photos/<filename>
app.use("/photos", express.static(UPLOAD_DIR, {
  maxAge: "30d", // photos rarely change once issued — safe to cache long
}));

app.listen(PORT, () => {
  console.log(`Photo server running on port ${PORT}`);
  console.log(`Serving uploads from: ${UPLOAD_DIR}`);
  console.log(`Public base URL: ${PUBLIC_BASE_URL}`);
});