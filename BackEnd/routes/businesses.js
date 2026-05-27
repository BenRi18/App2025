// BackEnd/routes/businesses.js
import express     from "express";
import Business    from "../models/Business.js";
import JobListing  from "../models/JobListing.js";
import Swipe       from "../models/Swipe.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ─── GET /businesses/nearby ───────────────────────────────────────────────────
// Returns up to 50 businesses the logged-in user has NOT yet swiped on.
// Each business includes its most recent active job listing so swipe cards
// can display the role/salary without a second request.
router.get("/nearby", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can view businesses" });
    }

    // 1 — IDs the user has already swiped on (left OR right)
    const swipedIds = await Swipe
      .find({ user_id: req.user.id })
      .distinct("business_id");

    // 2 — Businesses not yet seen, newest first
    const businesses = await Business
      .find({ _id: { $nin: swipedIds } })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(50);

    if (businesses.length === 0) return res.json([]);

    // 3 — Fetch the most recent active job listing for each business
    const bizIds = businesses.map(b => b._id);
    const jobListings = await JobListing
      .find({ business_id: { $in: bizIds }, is_active: true })
      .sort({ createdAt: -1 });

    // Build a map: businessId → first (newest) job listing
    const jobMap = {};
    for (const job of jobListings) {
      const key = job.business_id.toString();
      if (!jobMap[key]) jobMap[key] = job; // keep only the newest per business
    }

    // 4 — Merge and respond
    const result = businesses.map(b => ({
      ...b.toJSON(),
      job_listing: jobMap[b._id.toString()]?.toJSON() ?? null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
