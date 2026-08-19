// BackEnd/routes/matches.js
import express          from "express";
import Match            from "../models/Match.js";
import BusinessDecision from "../models/BusinessDecision.js";
import Swipe            from "../models/Swipe.js";
import CV               from "../models/CV.js";
import { traitCompatibility, inferArchetype, resolveListingTarget } from "../utils/traitMatch.js";
import { buildRoleProfile } from "../config/listingQuestions.js";
import User             from "../models/User.js";
import Business         from "../models/Business.js";
import authMiddleware   from "../middleware/auth.js";
import { sendPush }     from "../utils/pushNotifications.js";
import { getIO }        from "../socket.js";

const router = express.Router();

// ─── GET /matches ──────────────────────────────────────────────────────────────
// Returns all matches for the logged-in user or business, newest first.
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const filter = role === "user" ? { user_id: id } : { business_id: id };

    const matches = await Match
      .find(filter)
      .populate("user_id",     "name avatar_path expoPushToken")
      .populate("business_id", "business_name avatar_path expoPushToken")
      .populate("job_id",      "job_title job_type")
      .sort({ last_message_at: -1, createdAt: -1 });

    // Shape the response from the perspective of the caller
    const result = matches.map(m => {
      const base = m.toJSON();
      const other = role === "user"
        ? { id: m.business_id._id.toString(), name: m.business_id.business_name, avatar: m.business_id.avatar_path }
        : { id: m.user_id._id.toString(),     name: m.user_id.name,             avatar: m.user_id.avatar_path };

      return {
        ...base,
        other_party:  other,
        job: m.job_id
          ? { id: m.job_id._id.toString(), title: m.job_id.job_title, type: m.job_id.job_type }
          : null,
        unread_count: role === "user" ? base.unread_user : base.unread_business,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /matches/:id ──────────────────────────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const filter = role === "user"
      ? { _id: req.params.id, user_id:     id }
      : { _id: req.params.id, business_id: id };

    const match = await Match
      .findOne(filter)
      .populate("user_id",     "name avatar_path")
      .populate("business_id", "business_name avatar_path");

    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── GET /matches/applicants (business only) ───────────────────────────────────
// Lists users who right-swiped on this business and haven't been decided on yet.
router.get("/applicants/pending", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can view applicants" });
    }

    // Users who right-swiped this business
    const swipes = await Swipe
      .find({ business_id: req.user.id, direction: "right" })
      .populate("user_id", "name age email phone_number avatar_path location work_type experience_level industry_preference skills languages bio traits")
      .populate("job_id",  "job_title job_type archetype description job_description role_answers")
      .sort({ createdAt: -1 });

    // Exclude user+job combinations already decided on
    const decisions = await BusinessDecision
      .find({ business_id: req.user.id })
      .select("user_id job_id");
    const decidedSet = new Set(
      decisions.map(d => `${d.user_id}:${d.job_id ?? "null"}`)
    );

    // Attach each applicant's most recent CV sent to this business
    const applicantIds = [...new Set(
      swipes.filter(s => s.user_id).map(s => s.user_id._id.toString())
    )];
    const cvs = await CV
      .find({ business_id: req.user.id, user_id: { $in: applicantIds } })
      .sort({ createdAt: -1 });
    const cvMap = {};
    for (const cv of cvs) {
      const key = cv.user_id.toString();
      if (!cvMap[key]) cvMap[key] = cv.path;   // newest per user
    }

    const pending = swipes
      .filter(s => s.user_id && !decidedSet.has(`${s.user_id._id}:${s.job_id?._id ?? "null"}`))
      .map(s => ({
        swipe_id:   s._id.toString(),
        applied_at: s.createdAt,
        status:     s.status,
        job: s.job_id
          ? { id: s.job_id._id.toString(), title: s.job_id.job_title, type: s.job_id.job_type }
          : null,
        // Personality fit vs the job they applied for (0–100, null if unknowable)
        fit_score: (() => {
          if (!s.user_id.traits || !s.job_id) return null;
          const jobObj = s.job_id.toJSON();
          const rp = jobObj.role_answers?.length ? buildRoleProfile(jobObj.role_answers) : null;
          const { traits: tgt, importance } = resolveListingTarget(jobObj, rp);
          if (!tgt || Object.keys(tgt).length === 0) return null;
          return Math.round(traitCompatibility(s.user_id.traits, tgt, importance) * 100);
        })(),
        ...s.user_id.toJSON(),
        cv_path: cvMap[s.user_id._id.toString()] ?? s.user_id.cv_path ?? null,
      }));

    res.json(pending);
  } catch (err) {
    next(err);
  }
});

// ─── POST /matches/applicants/:userId/decision (business only) ─────────────────
// Business likes or passes on an applicant. Liking a user who already
// right-swiped creates a mutual Match and notifies both parties.
router.post("/applicants/:userId/decision", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can make decisions on applicants" });
    }

    const { decision } = req.body;
    if (!["like", "pass"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'like' or 'pass'" });
    }

    const { userId } = req.params;
    const { jobId }  = req.body;   // optional — decide on a specific application

    // Verify the user actually applied to this business (for this job, if given)
    const swipeFilter = {
      user_id:     userId,
      business_id: req.user.id,
      direction:   "right",
    };
    if (jobId) swipeFilter.job_id = jobId;
    const swipe = await Swipe.findOne(swipeFilter).sort({ createdAt: -1 });
    if (!swipe) {
      return res.status(404).json({ error: "This user has not applied to your business" });
    }

    const matchedJobId = swipe.job_id ?? null;

    // Record decision (upsert — allows changing mind before a match)
    await BusinessDecision.findOneAndUpdate(
      { business_id: req.user.id, user_id: userId, job_id: matchedJobId },
      { decision },
      { upsert: true, new: true }
    );

    if (decision === "pass") {
      return res.json({ matched: false });
    }

    // ── It's a like — check for mutual match (per job) ──────────────────────
    const existingMatch = await Match.findOne({
      user_id:     userId,
      business_id: req.user.id,
      job_id:      matchedJobId,
    });
    if (existingMatch) {
      return res.json({ matched: true, match: existingMatch.toJSON() });
    }

    // Create the match
    const match = await Match.create({
      user_id:     userId,
      business_id: req.user.id,
      job_id:      matchedJobId || undefined,
    });

    // Notify both parties
    const [user, biz] = await Promise.all([
      User.findById(userId).select("expoPushToken name"),
      Business.findById(req.user.id).select("expoPushToken business_name"),
    ]);

    await Promise.all([
      sendPush(
        user?.expoPushToken,
        "🎉 New Match!",
        `${biz?.business_name || "A business"} liked your profile. Start chatting!`,
        { type: "match", matchId: match._id.toString() }
      ),
      sendPush(
        biz?.expoPushToken,
        "🎉 New Match!",
        `You matched with ${user?.name || "an applicant"}. Start chatting!`,
        { type: "match", matchId: match._id.toString() }
      ),
    ]);

    // Notify via socket if both parties are online
    const io = getIO();
    if (io) io.emit("new_match", { matchId: match._id.toString(), userId, businessId: req.user.id });

    res.status(201).json({ matched: true, match: match.toJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
