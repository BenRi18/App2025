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
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

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
