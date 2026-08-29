// BackEnd/routes/jobs.js
// Full CRUD for job listings — businesses manage their own; users can browse.
import express from "express";
import { body, validationResult } from "express-validator";
import JobListing    from "../models/JobListing.js";
import Business      from "../models/Business.js";
import Swipe         from "../models/Swipe.js";
import User          from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { rankBusinessesForUser, findTown } from "../utils/matchScore.js";
import { notifyCompatibleUsers } from "../utils/notifyCompatible.js";
import { LISTING_QUESTIONS } from "../config/listingQuestions.js";

const router = express.Router();

const VALID_JOB_TYPES = ["full-time", "part-time", "casual"];

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
};

const jobValidators = [
  body("job_title")
    .trim().notEmpty().withMessage("Job title is required")
    .isLength({ min: 2, max: 150 }).withMessage("Job title must be 2–150 characters"),

  body("job_type")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(VALID_JOB_TYPES).withMessage("Invalid job type"),

  body("salary_range")
    .optional({ nullable: true, checkFalsy: true }).trim()
    .isLength({ max: 100 }).withMessage("Salary range must be under 100 characters"),

  body("description")
    .optional({ nullable: true, checkFalsy: true }).trim()
    .isLength({ max: 1000 }).withMessage("Description must be under 1000 characters"),
];

// ─── POST /jobs ────────────────────────────────────────────────────────────────
// Business creates a new listing.

// Sanitize an optional { lat, lng, label } location payload; null when unusable
function parseLocation(loc) {
  if (!loc || typeof loc !== "object") return null;
  const lat = Number(loc.lat), lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat, lng,
    label: typeof loc.label === "string" ? loc.label.slice(0, 150) : undefined,
  };
}

// ─── GET /jobs/listing-questions ──────────────────────────────────────────────
// The per-listing role questionnaire, served to the posting form.
router.get("/listing-questions", authMiddleware, (_req, res) => {
  res.json(LISTING_QUESTIONS);
});

router.post("/", authMiddleware, jobValidators, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can create job listings" });
    }
    if (!validate(req, res)) return;

    const { job_title, job_type, salary_range, archetype, location, role_answers, backdrop } = req.body;
    const description = req.body.description ?? req.body.job_description;

    const business = await Business.findById(req.user.id)
      .select("business_name city street location");

    // Per-role location fallback chain: explicit pin → the business's own
    // pinned premises → town lookup (legacy seed data only)
    let loc = parseLocation(location);
    if (!loc && business?.location?.lat != null) {
      loc = {
        lat:   business.location.lat,
        lng:   business.location.lng,
        label: business.location.label ?? business.city ?? undefined,
      };
    }
    if (!loc && business?.city) {
      const townCoords = findTown(business.city.toLowerCase());
      if (townCoords) {
        loc = { lat: townCoords[0], lng: townCoords[1], label: business.city };
      }
    }

    const listing = await JobListing.create({
      business_id:  req.user.id,
      job_title,
      job_type:     job_type     ?? undefined,
      salary_range: salary_range ?? undefined,
      description:  description  ?? undefined,
      archetype:    archetype    ?? undefined,
      location:     loc          ?? undefined,
      role_answers: Array.isArray(role_answers) && role_answers.length ? role_answers : undefined,
      backdrop:     typeof backdrop === "string" ? backdrop.slice(0, 40) : undefined,
    });

    // Ping compatible nearby users — fire and forget, never blocks the response
    if (listing.is_active && business) {
      notifyCompatibleUsers(listing, business).catch(() => {});
    }

    res.status(201).json(listing.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── GET /jobs ─────────────────────────────────────────────────────────────────
// Browse all active listings. Users see everyone's; businesses see their own.
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const filter = req.user.role === "business"
      ? { business_id: req.user.id }
      : { is_active: true };

    const listings = await JobListing
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(listings);
  } catch (err) {
    next(err);
  }
});

// ─── GET /jobs/feed ────────────────────────────────────────────────────────────
// The swipe deck: one card per active job listing, ranked for the logged-in
// user, excluding jobs already swiped on. Legacy business-level swipes
// (job_id null) hide ALL of that business's jobs so users don't re-see
// businesses they already decided on before per-job swiping existed.
router.get("/feed", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can view the job feed" });
    }

    // 1 — Full user profile (needed for preference-based scoring)
    const user = await User
      .findById(req.user.id)
      .select("work_type industry_preference location travel_distance traits");

    // Live device position from the app (optional). Powers precise proximity
    // and is remembered (fire-and-forget) for compatibility notifications.
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    const liveCoords = Number.isFinite(lat) && Number.isFinite(lng) &&
                       lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ? [lat, lng] : null;
    if (liveCoords) {
      User.updateOne(
        { _id: req.user.id },
        { last_location: { lat, lng, at: new Date() } }
      ).catch(() => {});
    }

    // 2 — What the user has already swiped on
    const swipes = await Swipe
      .find({ user_id: req.user.id })
      .select("business_id job_id");
    const swipedJobIds        = new Set();
    const fullySwipedBizIds   = new Set();
    for (const s of swipes) {
      if (s.job_id) swipedJobIds.add(s.job_id.toString());
      else          fullySwipedBizIds.add(s.business_id.toString());   // legacy
    }

    // 3 — Candidate jobs: active, not yet swiped, business not legacy-swiped.
    // With a known position, filter by real proximity AT THE DATABASE — this is
    // what makes the feed work worldwide: a traveler in Lisbon queries Lisbon
    // jobs, never the planet.
    const FEED_RADIUS_KM = { "5km": 15, "10km": 25, "25km": 50, "any": 100 };
    const baseFilter = {
      is_active: true,
      _id:         { $nin: [...swipedJobIds] },
      business_id: { $nin: [...fullySwipedBizIds] },
    };

    let jobs;
    if (liveCoords) {
      const radiusKm = FEED_RADIUS_KM[(user?.travel_distance ?? "").toLowerCase()] ?? 50;
      jobs = await JobListing.find({
        ...baseFilter,
        geo: {
          $near: {
            $geometry:    { type: "Point", coordinates: [liveCoords[1], liveCoords[0]] },
            $maxDistance: radiusKm * 1000,
          },
        },
      }).limit(300);   // $near returns nearest-first
    } else {
      // Position unknown (permission denied / simulator) — recency fallback
      jobs = await JobListing.find(baseFilter).sort({ createdAt: -1 }).limit(300);
    }

    if (jobs.length === 0) return res.json([]);

    // 4 — Fetch the owning businesses in one query
    const bizIds = [...new Set(jobs.map(j => j.business_id.toString()))];
    const businesses = await Business
      .find({ _id: { $in: bizIds } })
      .select("business_name street city postcode description industry avatar_path");
    const bizMap = Object.fromEntries(businesses.map(b => [b._id.toString(), b]));

    // 5 — One rankable entry per job (business fields + this job as job_listing)
    const merged = jobs
      .filter(j => bizMap[j.business_id.toString()])
      .map(j => {
        const biz = bizMap[j.business_id.toString()];
        return { ...biz.toJSON(), job_listing: j.toJSON() };
      });

    const ranked = rankBusinessesForUser(user?.toJSON?.() ?? user ?? {}, merged, liveCoords);

    // 6 — Shape for the deck: job front and center, business as context
    const feed = ranked.slice(0, 50).map(e => ({
      job: e.job_listing,
      business: {
        id:            e.id,
        business_name: e.business_name,
        street:        e.street,
        city:          e.city,
        description:   e.description,
        industry:      e.industry,
        avatar_path:   e.avatar_path,
      },
      match_score: e.match_score,
      distance_km: e.match_breakdown?.distance_km ?? null,
    }));

    res.json(feed);
  } catch (err) {
    next(err);
  }
});

// ─── GET /jobs/:id ─────────────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const listing = await JobListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Job listing not found" });
    res.json(listing.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── PUT /jobs/:id ─────────────────────────────────────────────────────────────
// Update a listing (owner only).
router.put("/:id", authMiddleware, jobValidators, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can edit job listings" });
    }
    if (!validate(req, res)) return;

    const listing = await JobListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Job listing not found" });
    if (listing.business_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only edit your own listings" });
    }

    const { job_title, job_type, salary_range, archetype, location, role_answers, backdrop } = req.body;
    const description = req.body.description ?? req.body.job_description;
    const patch = {
      job_title,
      job_type:     job_type     ?? undefined,
      salary_range: salary_range ?? undefined,
      description:  description  ?? undefined,
      archetype:    archetype    ?? undefined,
    };
    const loc = parseLocation(location);
    if (loc) {
      patch.location = loc;
      patch.geo = { type: "Point", coordinates: [loc.lng, loc.lat] };
    }
    if (Array.isArray(role_answers)) {
      patch.role_answers = role_answers.length ? role_answers : undefined;
    }
    if (typeof backdrop === "string") patch.backdrop = backdrop.slice(0, 40);

    const updated = await JobListing.findByIdAndUpdate(
      req.params.id,
      patch,
      { new: true, runValidators: true }
    );

    res.json(updated.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /jobs/:id/toggle ────────────────────────────────────────────────────
// Toggle is_active on/off (owner only).
router.patch("/:id/toggle", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can manage job listings" });
    }

    const listing = await JobListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Job listing not found" });
    if (listing.business_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only manage your own listings" });
    }

    listing.is_active = !listing.is_active;
    await listing.save();

    res.json({ id: listing._id.toString(), is_active: listing.is_active });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /jobs/:id ──────────────────────────────────────────────────────────
// Permanently deletes a listing (owner only). Use toggle to just pause it.
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can delete job listings" });
    }

    const listing = await JobListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Job listing not found" });
    if (listing.business_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own listings" });
    }

    await listing.deleteOne();
    res.json({ message: "Job listing deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
