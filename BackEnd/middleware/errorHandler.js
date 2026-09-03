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

  // ── Unexpected upload field / wrong form key ──────────────────────────────
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Unexpected file upload" });
  }

  // ── Malformed JSON body ───────────────────────────────────────────────────
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && "body" in err)) {
    return res.status(400).json({ error: "Malformed request body" });
  }

  // ── Body larger than the parser allows ────────────────────────────────────
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }

  // ── Database unreachable — distinguish from a bug in our code ─────────────
  if (err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError" ||
      err.name === "MongoTimeoutError") {
    console.error("🔴 Database unreachable:", err.message);
    return res.status(503).json({
      error: "Service temporarily unavailable. Please try again shortly.",
    });
  }

  // ── File storage (S3 / R2) failures ───────────────────────────────────────
  if (err.$metadata || ["NoSuchBucket", "AccessDenied", "InvalidAccessKeyId",
                        "SignatureDoesNotMatch", "NetworkingError"].includes(err.name)) {
    console.error("🔴 Storage error:", err.name, "-", err.message);
    return res.status(502).json({
      error: "File storage is unavailable right now. Please try again shortly.",
    });
  }

  // ── Catch-all ─────────────────────────────────────────────────────────────
  // Log the stack (not just the message) — without it, production 500s are
  // undebuggable. The client still gets a generic message: internal details
  // are useful to us and useful to an attacker.
  console.error("🔴 Unhandled error on", req.method, req.originalUrl);
  console.error(err.stack || err.message || err);
  res.status(500).json({ error: "Something went wrong" });
}

export default errorHandler;
