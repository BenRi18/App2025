// BackEnd/routes/jobs.js
// Full CRUD for job listings — businesses manage their own; users can browse.
import express from "express";
import { body, validationResult } from "express-validator";
import JobListing    from "../models/JobListing.js";
import authMiddleware from "../middleware/auth.js";

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
router.post("/", authMiddleware, jobValidators, async (req, res, next) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can create job listings" });
    }
    if (!validate(req, res)) return;

    const { job_title, job_type, salary_range, description } = req.body;
    const listing = await JobListing.create({
      business_id:  req.user.id,
      job_title,
      job_type:     job_type     ?? undefined,
      salary_range: salary_range ?? undefined,
      description:  description  ?? undefined,
    });

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

    const { job_title, job_type, salary_range, description } = req.body;
    const updated = await JobListing.findByIdAndUpdate(
      req.params.id,
      {
        job_title,
        job_type:     job_type     ?? undefined,
        salary_range: salary_range ?? undefined,
        description:  description  ?? undefined,
      },
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
