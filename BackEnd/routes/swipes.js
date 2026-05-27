// BackEnd/routes/swipes.js
import express from "express";

import Swipe    from "../models/Swipe.js";
import CV       from "../models/CV.js";
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

    const { businessId } = req.body;
    const cvFile = req.file;

    if (!businessId || !cvFile) {
      return res.status(400).json({ error: "Business ID and CV are required" });
    }

    const existing = await Swipe.findOne({ user_id: req.user.id, business_id: businessId });
    if (existing) {
      return res.status(400).json({ error: "You already swiped on this business" });
    }

    const swipe = await Swipe.create({
      user_id:     req.user.id,
      business_id: businessId,
      direction:   "right",
    });

    const stored = filePath(cvFile);  // S3 URL or local disk path

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

// ─── GET /swipes/user ─────────────────────────────────────────────────────────
// Returns all right-swiped businesses for the logged-in user.
router.get("/user", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can view this" });
    }

    const swipes = await Swipe
      .find({ user_id: req.user.id, direction: "right" })
      .populate("business_id", "business_name owner_name street email")
      .sort({ createdAt: -1 });

    const result = swipes.map(s => {
      const b = s.business_id;
      return {
        id:            b._id.toString(),
        business_name: b.business_name,
        owner_name:    b.owner_name,
        street:        b.street,
        email:         b.email,
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
