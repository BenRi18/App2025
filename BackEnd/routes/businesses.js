// BackEnd/routes/businesses.js
import express     from "express";
import Business    from "../models/Business.js";
import JobListing  from "../models/JobListing.js";
import Swipe       from "../models/Swipe.js";
import User        from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { rankBusinessesForUser } from "../utils/matchScore.js";

const router = express.Router();

// ─── GET /businesses/nearby ───────────────────────────────────────────────────
// Returns up to 50 businesses the logged-in user has NOT yet swiped on,
// ranked by match score (work type, industry, location, listing freshness).
// Each business includes its most recent active job listing plus a
// match_score (0–100) the frontend can surface as a badge.
router.get("/nearby", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can view businesses" });
    }

    // 1 — Full user profile (needed for preference-based scoring)
    const user = await User
      .findById(req.user.id)
      .select("work_type industry_preference location travel_distance traits");

    // 2 — IDs the user has already swiped on (left OR right)
    const swipedIds = await Swipe
      .find({ user_id: req.user.id })
      .distinct("business_id");

    // 3 — Candidate pool: fetch a larger batch so ranking has room to work,
    //     then trim to 50 after scoring.
    const businesses = await Business
      .find({ _id: { $nin: swipedIds } })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(200);

    if (businesses.length === 0) return res.json([]);

    // 4 — Newest active job listing per business
    const bizIds = businesses.map(b => b._id);
    const jobListings = await JobListing
      .find({ business_id: { $in: bizIds }, is_active: true })
      .sort({ createdAt: -1 });

    const jobMap = {};
    for (const job of jobListings) {
      const key = job.business_id.toString();
      if (!jobMap[key]) jobMap[key] = job; // keep only the newest per business
    }

    // 5 — Merge, score, rank, trim
    const merged = businesses.map(b => ({
      ...b.toJSON(),
      job_listing: jobMap[b._id.toString()]?.toJSON() ?? null,
    }));

    const ranked = rankBusinessesForUser(user?.toJSON?.() ?? user ?? {}, merged);

    res.json(ranked.slice(0, 50));
  } catch (err) {
    next(err);
  }
});

export default router;
