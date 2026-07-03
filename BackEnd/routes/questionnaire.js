// BackEnd/routes/questionnaire.js
// GET  /questionnaire        → question bank (for the frontend to render)
// POST /questionnaire        → submit answers, compute + store trait vector
// GET  /questionnaire/archetypes → job archetype list (for business job forms)

import express from "express";
import User    from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { QUESTIONS, JOB_ARCHETYPES } from "../config/questionnaire.js";
import { computeUserTraits } from "../utils/traitMatch.js";

const router = express.Router();

// ─── GET /questionnaire ───────────────────────────────────────────────────────
// Public shape of the question bank — trait mappings are stripped so the
// client can't see (or game) which answer maps to which trait.
router.get("/", authMiddleware, (_req, res) => {
  const questions = QUESTIONS.map((q) => ({
    id:      q.id,
    text:    q.text,
    options: q.options.map(({ id, text }) => ({ id, text })),
  }));
  res.json({ questions });
});

// ─── POST /questionnaire ──────────────────────────────────────────────────────
// Body: { answers: { free_time: "a", sports: "c", ... } }
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can submit the questionnaire" });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "answers object is required" });
    }

    // Keep only known question ids with known option ids
    const clean = {};
    for (const q of QUESTIONS) {
      const a = answers[q.id];
      if (typeof a === "string" && q.options.some((o) => o.id === a)) {
        clean[q.id] = a;
      }
    }

    if (Object.keys(clean).length === 0) {
      return res.status(400).json({ error: "No valid answers provided" });
    }

    const traits = computeUserTraits(clean);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { questionnaire_answers: clean, traits },
      { new: true }
    ).select("questionnaire_answers traits");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      message: "Questionnaire saved",
      answered: Object.keys(clean).length,
      total: QUESTIONS.length,
      traits,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /questionnaire/archetypes ────────────────────────────────────────────
// For the business job-creation form: a dropdown of role types.
router.get("/archetypes", authMiddleware, (_req, res) => {
  const archetypes = Object.entries(JOB_ARCHETYPES).map(([key, a]) => ({
    key,
    label: a.label,
  }));
  res.json({ archetypes });
});

export default router;
