// BackEnd/routes/swipes.js
import express from "express";

import Swipe    from "../models/Swipe.js";
import JobListing       from "../models/JobListing.js";
import BusinessDecision from "../models/BusinessDecision.js";
import { learnFromSwipe } from "../utils/learnPreferences.js";
import CV       from "../models/CV.js";
import Match    from "../models/Match.js";
import User     from "../models/User.js";
import Business from "../models/Business.js";
import authMiddleware        from "../middleware/auth.js";
import { uploadCV, filePath } from "../middleware/upload.js";
import { sendPush }           from "../utils/pushNotifications.js";

const router = express.Router();

// ─── POST /swipes ─────────────────────────────────────────────────────────────
// Record a swipe (left or right) without a CV attachment.
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { business_id, direction } = req.body;

    if (!["left", "right"].includes(direction)) {
      return res.status(400).json({ error: "Invalid direction" });
    }
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can swipe" });
    }

    // Check for duplicate swipe
    const existing = await Swipe.findOne({ user_id: req.user.id, business_id });
    if (existing) {
      return res.status(400).json({ error: "You already swiped on this business" });
    }

    const swipe = await Swipe.create({
      user_id:     req.user.id,
      business_id,
      direction,
      status: direction === "right" ? "applied" : undefined,
    });

    if (direction === "right") {
      const [userDoc, bizDoc] = await Promise.all([
        User.findById(req.user.id).select("name email phone_number age"),
        Business.findById(business_id).select("business_name email"),
      ]);

      if (!userDoc || !bizDoc) {
        return res.status(404).json({ error: "User or Business not found" });
      }

      console.log(
        `📩 CV Sent: ${userDoc.name} (${userDoc.email}) → ${bizDoc.business_name} (${bizDoc.email})`
      );

      return res.json({
        message:  "Swipe recorded and CV sent (simulated)",
        swipe:    swipe.toJSON(),
        sent_to:  bizDoc.business_name,
      });
    }

    res.json({ message: "Swipe recorded", swipe: swipe.toJSON() });

  } catch (err) {
    next(err);
  }
});

// ─── POST /swipes/right ───────────────────────────────────────────────────────
// Record a right-swipe WITH a CV file upload.
router.post("/right", authMiddleware, uploadCV.single("cv"), async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can swipe" });
    }

    const { businessId, jobId } = req.body;
    const cvFile = req.file;

    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    // If a job is specified, it must exist, belong to this business, and be active
    if (jobId) {
      const job = await JobListing.findOne({ _id: jobId, business_id: businessId, is_active: true });
      if (!job) {
        return res.status(400).json({ error: "Job listing not found for this business" });
      }
    }

    // CV: a freshly uploaded file, or the one stored on the user's profile
    const me = await User.findById(req.user.id).select("cv_path");
    let stored = cvFile ? filePath(cvFile) : (me?.cv_path ?? null);
    if (!stored) {
      return res.status(400).json({ error: "No CV on file — add your CV before applying" });
    }
    // A fresh upload becomes the stored default if none exists yet
    if (cvFile && !me?.cv_path) {
      await User.updateOne({ _id: req.user.id }, { cv_path: stored });
    }

    // One application per business+job combination
    const existing = await Swipe.findOne({
      user_id:     req.user.id,
      business_id: businessId,
      job_id:      jobId ?? null,
    });
    if (existing) {
      return res.status(400).json({ error: "You already applied to this job" });
    }

    const swipe = await Swipe.create({
      user_id:     req.user.id,
      business_id: businessId,
      job_id:      jobId || undefined,
      direction:   "right",
      status:      "applied",
    });

    // Applying is the strongest positive signal there is
    if (jobId) {
      JobListing.findById(jobId)
        .then(job => learnFromSwipe(req.user.id, job, "right", 2))
        .catch(() => {});
    }

    await CV.create({
      user_id:     req.user.id,
      business_id: businessId,
      path:        stored,
    });

    console.log(`📩 CV uploaded: User ${req.user.id} → Business ${businessId}`);
    res.json({
      message: "Swipe recorded and CV uploaded",
      swipe:   swipe.toJSON(),
      cvPath:  stored,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /swipes/stats ────────────────────────────────────────────────────────
// The user's own numbers — applications, outcomes, and where they're aiming.
router.get("/stats", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users have stats" });
    }

    const [applications, matches, decisions, user] = await Promise.all([
      Swipe.find({ user_id: req.user.id, direction: "right" })
        .populate("job_id", "job_title archetype job_type")
        .select("job_id createdAt"),
      Match.countDocuments({ user_id: req.user.id }),
      BusinessDecision.countDocuments({ user_id: req.user.id, decision: "pass" }),
      User.findById(req.user.id).select("traits learned"),
    ]);

    // Most-applied-to kind of work
    const archCounts = {};
    for (const s of applications) {
      const a = s.job_id?.archetype;
      if (a) archCounts[a] = (archCounts[a] ?? 0) + 1;
    }
    const topArchetype = Object.entries(archCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // First application date, for a "since" line
    const firstAt = applications.length
      ? applications.reduce((min, s) => (s.createdAt < min ? s.createdAt : min), applications[0].createdAt)
      : null;

    res.json({
      applications: applications.length,
      matches,
      rejected:     decisions,
      in_review:    Math.max(0, applications.length - matches - decisions),
      top_archetype: topArchetype,
      swipe_signals: user?.learned?.signals ?? 0,
      since:        firstAt,
    });
  } catch (err) { next(err); }
});

// ─── GET /swipes/applications ─────────────────────────────────────────────────
// The user's application tracker: every job they applied to, with the current
// status derived from the business's side of the funnel:
//   accepted  → a match exists (business liked back) — includes match_id
//   rejected  → the business passed on this application
//   in_review → no decision yet
router.get("/applications", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users have applications" });
    }

    const [swipes, decisions, matches] = await Promise.all([
      Swipe.find({ user_id: req.user.id, direction: "right" })
        .populate("job_id", "job_title job_type")
        .populate("business_id", "business_name avatar_path city")
        .sort({ createdAt: -1 }),
      BusinessDecision.find({ user_id: req.user.id }).select("business_id job_id decision"),
      Match.find({ user_id: req.user.id }).select("business_id job_id"),
    ]);

    const key = (biz, job) => `${biz}:${job ?? "null"}`;
    const decisionMap = new Map(decisions.map(d => [key(d.business_id, d.job_id), d.decision]));
    const matchMap    = new Map(matches.map(m => [key(m.business_id, m.job_id), m._id.toString()]));

    const applications = swipes
      .filter(s => s.business_id)
      .map(s => {
        const k        = key(s.business_id._id, s.job_id?._id);
        const matchId  = matchMap.get(k);
        const decision = decisionMap.get(k);
        const status   = matchId ? "accepted" : decision === "pass" ? "rejected" : "in_review";
        return {
          id:         s._id.toString(),
          applied_at: s.createdAt,
          status,
          match_id:   matchId ?? null,
          job: s.job_id
            ? { id: s.job_id._id.toString(), title: s.job_id.job_title, type: s.job_id.job_type }
            : null,
          business: {
            id:            s.business_id._id.toString(),
            business_name: s.business_id.business_name,
            avatar_path:   s.business_id.avatar_path ?? null,
            city:          s.business_id.city ?? null,
          },
        };
      });

    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// ─── GET /swipes/user ─────────────────────────────────────────────────────────
// Returns all right-swiped businesses for the logged-in user.
// Includes application status, swipe_id, and match_id (if matched).
router.get("/user", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can view this" });
    }

    const swipes = await Swipe
      .find({ user_id: req.user.id, direction: "right" })
      .populate("business_id", "business_name owner_name street email")
      .sort({ createdAt: -1 });

    // Fetch CVs and Matches in one pass each
    const businessIds = swipes.map(s => s.business_id._id);
    const [cvs, matches] = await Promise.all([
      CV.find({ user_id: req.user.id, business_id: { $in: businessIds } }),
      Match.find({ user_id: req.user.id, business_id: { $in: businessIds } }),
    ]);

    const cvMap    = Object.fromEntries(cvs.map(c => [c.business_id.toString(), c.path]));
    const matchMap = Object.fromEntries(matches.map(m => [m.business_id.toString(), m._id.toString()]));

    const result = swipes.map(s => {
      const b = s.business_id;
      return {
        id:            s._id.toString(),       // swipe id (used for status updates)
        swipe_id:      s._id.toString(),
        business_name: b.business_name,
        owner_name:    b.owner_name,
        street:        b.street,
        email:         b.email,
        status:        s.status ?? "applied",
        cv_path:       cvMap[b._id.toString()]    ?? null,
        match_id:      matchMap[b._id.toString()] ?? null,
        created_at:    s.createdAt,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /swipes/business ─────────────────────────────────────────────────────
// Returns all users who right-swiped on this business, with their CV if uploaded.
router.get("/business", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can view this" });
    }

    const swipes = await Swipe
      .find({ business_id: req.user.id, direction: "right" })
      .populate("user_id", "name age email phone_number")
      .sort({ createdAt: -1 });

    // Fetch CVs for all matched users in one query
    const userIds = swipes.map(s => s.user_id._id);
    const cvs     = await CV.find({ business_id: req.user.id, user_id: { $in: userIds } });
    const cvMap   = Object.fromEntries(cvs.map(c => [c.user_id.toString(), c.path]));

    const result = swipes.map(s => {
      const u = s.user_id;
      return {
        id:           u._id.toString(),
        name:         u.name,
        age:          u.age,
        email:        u.email,
        phone_number: u.phone_number,
        created_at:   s.createdAt,
        cv_path:      cvMap[u._id.toString()] ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /swipes/:id/status ─────────────────────────────────────────────────
// Business updates the application status of a right-swipe.
const VALID_STATUSES = ["viewed", "shortlisted", "rejected", "hired"];
const STATUS_MESSAGES = {
  viewed:      "viewed your application",
  shortlisted: "has shortlisted you! 🎉",
  rejected:    "has reviewed your application",
  hired:       "wants to hire you! 🎊",
};

router.patch("/:id/status", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can update application status" });
    }

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const swipe = await Swipe.findById(req.params.id);
    if (!swipe) return res.status(404).json({ error: "Swipe not found" });
    if (swipe.business_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorised to update this application" });
    }
    if (swipe.direction !== "right") {
      return res.status(400).json({ error: "Can only update status of right-swipes" });
    }

    swipe.status = status;
    await swipe.save();

    // Push notification to the applicant
    const [user, biz] = await Promise.all([
      User.findById(swipe.user_id).select("expoPushToken name"),
      Business.findById(req.user.id).select("business_name"),
    ]);

    await sendPush(
      user?.expoPushToken,
      `${biz?.business_name || "A business"} ${STATUS_MESSAGES[status]}`,
      status === "hired"
        ? "Congratulations! Check your messages."
        : "Log in to view your application status.",
      { type: "status_update", swipeId: swipe._id.toString(), status }
    );

    res.json(swipe.toJSON());
  } catch (err) {
    next(err);
  }
});

export default router;
