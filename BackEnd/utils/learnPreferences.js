// BackEnd/utils/learnPreferences.js
// Turns swipes into a preference profile. The quiz says who someone thinks
// they are; swipes say what they actually go for. We track both and let the
// ranker blend them.
import User from "../models/User.js";

/**
 * Mongoose `Map` fields come back as JS Maps, not plain objects — so
 * Object.entries() returns [] and bracket access returns undefined. Every
 * read of a Map field must go through here.
 */
function toPlain(v) {
  if (!v) return {};
  if (v instanceof Map) return Object.fromEntries(v);
  if (typeof v.toObject === "function") return v.toObject();
  return v;
}

// How far one swipe moves a score. Small, so a stray swipe doesn't rewrite
// someone's feed — but twenty consistent swipes clearly will.
const RATE = 0.12;

/**
 * Nudge the user's learned scores after a swipe. Fire-and-forget.
 * @param {string} userId
 * @param {object} job        the JobListing that was swiped (needs job_type, archetype)
 * @param {"left"|"right"} direction
 * @param {number} weight     1 for a swipe, higher for stronger signals (e.g. saving)
 */
export async function learnFromSwipe(userId, job, direction, weight = 1) {
  try {
    if (!job) return;
    const target = direction === "right" ? 1 : 0;
    const rate   = Math.min(RATE * weight, 0.4);

    const user = await User.findById(userId).select("learned");
    if (!user) return;

    const jobTypes = new Map(Object.entries(toPlain(user.learned?.job_types)));
    const archs    = new Map(Object.entries(toPlain(user.learned?.archetypes)));

    const nudge = (map, key) => {
      if (!key) return;
      const current = map.get(key) ?? 0.5;              // start neutral
      map.set(key, +(current + (target - current) * rate).toFixed(4));
    };

    nudge(jobTypes, job.job_type);
    nudge(archs,    job.archetype);

    await User.updateOne(
      { _id: userId },
      {
        "learned.job_types":  Object.fromEntries(jobTypes),
        "learned.archetypes": Object.fromEntries(archs),
        "learned.signals":    (user.learned?.signals ?? 0) + 1,
      }
    );
  } catch (err) {
    console.warn("learnFromSwipe failed:", err.message);
  }
}
