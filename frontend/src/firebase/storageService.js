// src/firebase/storageService.js
//
// Uploads applicant photos to our own small photo server (running on your
// VPS) instead of Firebase Storage. This avoids Firebase Storage's 5GB
// free-tier limit by using your own server's disk instead — see
// photo-server/ in this project for that server's code.
//
// Firestore, Firebase Auth, and everything else in the app are completely
// untouched by this change — only the photo upload/delete mechanism moved.

const PHOTO_SERVER_URL = import.meta.env.VITE_PHOTO_SERVER_URL;
const UPLOAD_SECRET = import.meta.env.VITE_PHOTO_UPLOAD_SECRET;

// Uploads the applicant's photo to the photo server.
// The server names the file after the certId automatically.
// Returns a plain URL string, saved into Firestore exactly like the old
// Firebase Storage download URL was.
export const uploadCertificatePhoto = async (file, certId) => {
  const formData = new FormData();
  
  // FIX: In FormData, text fields MUST be appended BEFORE file fields.
  // Otherwise, multer's storage engine can't access req.body.certId 
  // when it is trying to determine the filename!
  formData.append("certId", certId);
  formData.append("photo", file);

  const response = await fetch(`${PHOTO_SERVER_URL}/upload`, {
    method: "POST",
    headers: {
      "x-upload-secret": UPLOAD_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Photo upload failed.");
  }

  const data = await response.json();
  return data.url;
};

export const deleteCertificatePhoto = async (photoUrl) => {
  if (!photoUrl) return;

  try {
    await fetch(`${PHOTO_SERVER_URL}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-upload-secret": UPLOAD_SECRET,
      },
      body: JSON.stringify({ url: photoUrl }),
    });
  } catch {
    // Server may be unreachable or file may already be gone —
    // silently ignore, matching the old Firebase behavior.
  }
};