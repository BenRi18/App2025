// BackEnd/middleware/errorHandler.js
function errorHandler(err, req, res, _next) {
  // ── Mongoose duplicate-key (e.g. email already registered) ───────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      error: `An account with this ${field} already exists. Please log in instead.`,
    });
  }

  // ── Mongoose schema validation error ──────────────────────────────────────
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors)[0]?.message || "Validation failed";
    return res.status(400).json({ error: msg });
  }

  // ── Invalid ObjectId (malformed id in URL / body) ────────────────────────
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // ── Multer file-size limit ────────────────────────────────────────────────
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (max 5 MB)" });
  }

  // ── JWT errors (propagated from authMiddleware) ───────────────────────────
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // ── Catch-all ─────────────────────────────────────────────────────────────
  console.error("Unhandled error:", err.message || err);
  res.status(500).json({ error: "Something went wrong" });
}

export default errorHandler;
