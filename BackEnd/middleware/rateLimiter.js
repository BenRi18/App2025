// BackEnd/middleware/rateLimiter.js
//
// Simple in-memory rate limiter — no external dependencies.
// For production, back this with Redis so limits survive restarts and
// work across multiple server instances.
//
// Usage:
//   import { makeRateLimiter } from "./middleware/rateLimiter.js";
//   router.post("/login",  makeRateLimiter(10, 15 * 60 * 1000), handler);
//   router.post("/register", makeRateLimiter(5, 60 * 60 * 1000), handler);

const store = new Map(); // ip → { count, resetAt }

// Prune expired entries every 10 minutes to prevent unbounded memory growth
const _storeSweep = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);
// unref so this housekeeping timer never keeps the process alive on shutdown
_storeSweep.unref?.();

/**
 * @param {number} maxRequests  Maximum allowed requests within the window
 * @param {number} windowMs     Time window in milliseconds
 */
export function makeRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    // Prefer X-Forwarded-For (set by load balancers / proxies) but fall back to direct IP
    const ip  = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
              ?? req.socket?.remoteAddress
              ?? "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count++;
    store.set(key, entry);

    // Set standard rate-limit response headers
    res.set("X-RateLimit-Limit",     maxRequests);
    res.set("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.set("X-RateLimit-Reset",     Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", retryAfterSec);
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Account-targeted limiter
//
// IP limiting alone doesn't stop a distributed attack: 500 machines each
// trying 10 passwords against ONE account never trips a per-IP limit. This
// limits attempts against a specific IDENTITY regardless of origin, and is
// applied ALONGSIDE the IP limiter (both must pass).
//
// Deliberately generous so a real user fumbling their password isn't locked
// out, but tight enough that guessing is hopeless.
// ─────────────────────────────────────────────────────────────────────────────
const accountStore = new Map(); // identity → { count, resetAt, lockedUntil }

const _accountSweep = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of accountStore) {
    if (now > entry.resetAt && (!entry.lockedUntil || now > entry.lockedUntil)) {
      accountStore.delete(key);
    }
  }
}, 10 * 60 * 1000);
_accountSweep.unref?.();

/**
 * Limit failed attempts against a single account identity.
 * @param {number} maxAttempts  failures allowed in the window
 * @param {number} windowMs     rolling window
 * @param {number} lockoutMs    how long to lock after exceeding
 */
export function makeAccountLimiter(maxAttempts, windowMs, lockoutMs) {
  return (req, res, next) => {
    const email = String(req.body?.email ?? "").toLowerCase().trim();
    const role  = String(req.body?.role  ?? "");
    if (!email) return next();

    const key = `${role}:${email}`;
    const now = Date.now();
    const entry = accountStore.get(key);

    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const mins = Math.ceil((entry.lockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Too many failed attempts for this account. Try again in ${mins} minute(s), or reset your password.`,
      });
    }

    // Expose the recorder so the route can count only FAILED attempts —
    // successful logins must never count against the user.
    res.locals.recordAuthFailure = () => {
      const now2 = Date.now();
      let e = accountStore.get(key);
      if (!e || now2 > e.resetAt) e = { count: 0, resetAt: now2 + windowMs };
      e.count++;
      if (e.count >= maxAttempts) {
        e.lockedUntil = now2 + lockoutMs;
        e.count = 0;
        console.warn(`🔒 Account temporarily locked after repeated failures: ${key}`);
      }
      accountStore.set(key, e);
    };
    res.locals.clearAuthFailures = () => accountStore.delete(key);

    next();
  };
}
