// BackEnd/middleware/upload.js
//
// Shared upload middleware.
//
// If S3_BUCKET + S3_ACCESS_KEY are set in .env, files are stored in S3 / R2.
// Otherwise they fall back to local disk (./uploads/) — good for development.
//
// Usage in routes:
//   import { uploadAvatar, uploadCV, filePath } from "../middleware/upload.js";
//   router.post("/avatar", authMiddleware, uploadAvatar.single("avatar"), handler);
//   // In handler: const stored = filePath(req.file);  // works for both S3 and disk

import multer           from "multer";
import multerS3         from "multer-s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path             from "path";
import fs               from "fs";

// ─── Decide storage backend ───────────────────────────────────────────────────
const useS3 = !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY);

let s3;
if (useS3) {
  s3 = new S3Client({
    region:      process.env.S3_REGION || "auto",
    // S3_ENDPOINT is only needed for Cloudflare R2 or other S3-compatible providers.
    // Leave it unset for standard AWS S3.
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
    credentials: {
      accessKeyId:     process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });
  console.log("☁️   File storage: S3 →", process.env.S3_BUCKET);
} else {
  console.log("💾  File storage: local disk (set S3_* env vars to use cloud storage)");
}

// ─── Storage factory ──────────────────────────────────────────────────────────
function makeStorage(folder) {
  if (useS3) {
    return multerS3({
      s3,
      bucket:      process.env.S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      // Public-read ACL — remove if your bucket blocks public access
      // acl: "public-read",
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".bin";
        cb(null, `${folder}/${Date.now()}-${req.user.id}${ext}`);
      },
    });
  }

  // Local disk fallback
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = `./uploads/${folder}`;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      cb(null, `${Date.now()}-${req.user.id}${ext}`);
    },
  });
}

// ─── Avatar upload ────────────────────────────────────────────────────────────
export const uploadAvatar = multer({
  storage: makeStorage("avatars"),
  limits:  { fileSize: 5 * 1024 * 1024 },      // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// ─── CV upload ────────────────────────────────────────────────────────────────
const CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const uploadCV = multer({
  storage: makeStorage("cvs"),
  limits:  { fileSize: 10 * 1024 * 1024 },     // 10 MB
  fileFilter: (_req, file, cb) => {
    if (CV_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, Word documents, or images are allowed for CVs"));
  },
});

// ─── Helper — returns the storable path / URL for a processed file ────────────
// S3:   file.location  → public HTTPS URL  (e.g. https://bucket.s3.region.amazonaws.com/avatars/...)
// Disk: file.path      → relative path     (e.g. uploads/avatars/...)
export function filePath(file) {
  return file.location ?? file.path;
}

/**
 * Delete a stored file, whichever backend holds it. Best-effort: a missing
 * file is not an error. Accepts the same string filePath() returned —
 * an S3/R2 URL or a local disk path.
 */
export async function deleteFile(stored) {
  if (!stored) return;
  try {
    if (useS3 && /^https?:\/\//.test(stored)) {
      // Key is everything after the bucket host
      const key = new URL(stored).pathname.replace(/^\/+/, "")
        .replace(new RegExp(`^${process.env.S3_BUCKET}/`), "");
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key:    decodeURIComponent(key),
      }));
    } else {
      await fs.promises.unlink(stored);
    }
  } catch {
    // Already gone, or storage hiccup — never block the caller
  }
}
