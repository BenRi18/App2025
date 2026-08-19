// BackEnd/utils/notifyCompatible.js
// When a job is posted, ping users whose personality fits it well and who are
// within reach. Fire-and-forget: never blocks or fails the posting request.
import User from "../models/User.js";
import { traitCompatibility, inferArchetype, resolveListingTarget } from "./traitMatch.js";
import { buildRoleProfile } from "../config/listingQuestions.js";
import { findTown, haversineKm, TRAVEL_LIMITS } from "./matchScore.js";
import { sendPush } from "./pushNotifications.js";

const FIT_THRESHOLD  = 0.75;               // notify at ≥75% compatibility
const LIVE_FRESH_MS  = 24 * 60 * 60 * 1000; // live position trusted for 24h
const MAX_NOTIFY     = 100;                 // safety cap per posting

export async function notifyCompatibleUsers(job, business) {
  try {
    const jobObj = job.toJSON?.() ?? job;
    const rp = jobObj.role_answers?.length ? buildRoleProfile(jobObj.role_answers) : null;
    const { traits: roleTarget, importance } = resolveListingTarget(jobObj, rp);
    if (!roleTarget || Object.keys(roleTarget).length === 0) return;

    const jobCoords = (job.location?.lat != null && job.location?.lng != null)
      ? [job.location.lat, job.location.lng]
      : (business?.location?.lat != null
          ? [business.location.lat, business.location.lng]
          : findTown((business?.city ?? "").toLowerCase()));   // legacy seed data

    const users = await User
      .find({ traits: { $exists: true }, expoPushToken: { $exists: true, $ne: null } })
      .select("traits expoPushToken travel_distance last_location");

    let sent = 0;
    for (const u of users) {
      if (sent >= MAX_NOTIFY) break;

      const fit = traitCompatibility(u.traits, roleTarget, importance);
      if (fit < FIT_THRESHOLD) continue;

      // Distance gate — worldwide rule: we only ping people we can place.
      // A user's position comes from their device (fresh last_location);
      // no position on file → no ping (they'll see the job in their feed).
      if (jobCoords) {
        const fresh = u.last_location?.lat != null &&
                      u.last_location?.at &&
                      Date.now() - new Date(u.last_location.at).getTime() < LIVE_FRESH_MS;
        if (!fresh) continue;
        const km    = haversineKm([u.last_location.lat, u.last_location.lng], jobCoords);
        const limit = TRAVEL_LIMITS[(u.travel_distance ?? "").toLowerCase()] ?? 15;
        if (km > Math.max(limit === Infinity ? 50 : limit, 5)) continue;
      }

      sendPush(
        u.expoPushToken,
        "A job that fits you just dropped 🎯",
        `${business.business_name} is hiring: "${job.job_title}" — ${Math.round(fit * 100)}% match for you`,
        { type: "compatible_job", jobId: job._id.toString() }
      );
      sent++;
    }
    if (sent) console.log(`🎯 Compatible-job pings sent: ${sent} for "${job.job_title}"`);
  } catch (err) {
    console.warn("notifyCompatibleUsers failed:", err.message);
  }
}
