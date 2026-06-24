// src/utils/compressImage.js
//
// Compresses an image file in the browser before upload, using the Canvas API
// (no external dependencies). This reduces Firebase Storage usage/cost and
// speeds up uploads, since phone camera photos are often 5–15MB uncompressed.
//
// Strategy:
// 1. Resize so the longest side is at most MAX_DIMENSION (most certificate
//    photos don't need to be larger than this for clear display/printing).
// 2. Re-encode as JPEG at decreasing quality until the file is under the
//    target size, or quality hits a sensible floor.

const MAX_DIMENSION = 1280; // px — generous for a certificate photo/thumbnail
const TARGET_MAX_BYTES = 3 * 1024 * 1024; // 3 MB, as requested
const MIN_QUALITY = 0.5; // never compress below this — avoids visible artifacts

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });

/**
 * Compresses an image File down to a target maximum size.
 * Returns a new File (JPEG), always under ~3MB for any reasonably-sized input.
 *
 * @param {File} file - the original image file selected by the admin
 * @returns {Promise<File>} compressed image file
 */
export const compressImage = async (file) => {
  // Already small enough and not an exotic format — skip processing.
  if (file.size <= TARGET_MAX_BYTES && file.type === "image/jpeg") {
    return file;
  }

  const img = await loadImage(file);

  // Calculate resized dimensions, preserving aspect ratio.
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // flatten transparency (e.g. PNG) onto white
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Step quality down until under the target size, or we hit the floor.
  let quality = 0.85;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  const originalName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${originalName}.jpg`, { type: "image/jpeg" });
};

// Convenience helper for displaying file size in UI (e.g. "1.4 MB").
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
