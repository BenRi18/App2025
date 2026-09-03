// FrontEnd/utils/errors.js
// One place that turns any failure into something a person can act on.
//
// Principle: an error message should say what happened and what to do next.
// It should never show a raw exception, and it should never be so vague that
// the user can't tell whether to retry, fix something, or give up.

/**
 * Pull the server's own message out of a Response, safely.
 * Returns null if the body isn't JSON or carries no message.
 */
export async function readServerError(res) {
  try {
    const data = await res.json();
    return data?.error ?? data?.message ?? null;
  } catch {
    return null;
  }
}

/** Map an HTTP status to a plain-language explanation. */
export function describeStatus(status) {
  if (status === 400) return "Something in that request wasn't right.";
  if (status === 401) return "Your session has expired. Log in again.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "That's no longer available.";
  if (status === 409) return "That already exists.";
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  if (status >= 500)  return "The server had a problem. Try again shortly.";
  return "Something went wrong.";
}

/**
 * Turn a thrown error into a user-facing message.
 * @param {Error} err
 * @param {string} fallback  what to say when nothing better is known
 */
export function describeError(err, fallback = "Something went wrong. Try again.") {
  if (!err) return fallback;
  if (err.sessionExpired) return "Your session has expired. Log in again.";
  if (err.isTimeout)      return "The server took too long to respond. Try again.";
  if (err.isNetworkError) return "Can't reach the server. Check your connection.";
  return err.message && err.message.length < 120 ? err.message : fallback;
}

/**
 * Standard read for any API call: returns { ok, data, error }.
 * Callers get one shape to handle instead of juggling status codes,
 * JSON parsing, and transport failures separately.
 */
export async function readResponse(res, fallback) {
  if (res.ok) {
    try {
      return { ok: true, data: await res.json(), error: null };
    } catch {
      return { ok: true, data: null, error: null };   // empty body is fine
    }
  }
  const serverMsg = await readServerError(res);
  return {
    ok: false,
    data: null,
    error: serverMsg ?? describeStatus(res.status) ?? fallback,
  };
}
