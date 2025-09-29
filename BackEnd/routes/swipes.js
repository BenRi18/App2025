// backend/routes/swipes.js
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Multer setup for CV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/cvs";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${req.user.id}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * POST /swipes
 * Body: { business_id, direction }
 * Handles left/right swipes without CV upload
 */
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { business_id, direction } = req.body;

    if (!["left", "right"].includes(direction)) {
      return res.status(400).json({ error: "Invalid direction" });
    }

    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users can swipe" });
    }

    // Prevent duplicate swipe
    const existing = await pool.query(
      `SELECT * FROM swipes WHERE user_id = $1 AND business_id = $2`,
      [req.user.id, business_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "You already swiped on this business" });
    }

    // Save swipe
    const result = await pool.query(
      `INSERT INTO swipes (user_id, business_id, direction)
       VALUES ($1, $2, $3) RETURNING id, created_at, direction`,
      [req.user.id, business_id, direction]
    );

    // If swipe right, simulate CV sent (for businesses without uploaded CVs)
    if (direction === "right") {
      const userRes = await pool.query(
        `SELECT name, age, email, phone_number FROM users WHERE id = $1`,
        [req.user.id]
      );

      const businessRes = await pool.query(
        `SELECT business_name, email AS business_email FROM businesses WHERE id = $1`,
        [business_id]
      );

      if (userRes.rows.length === 0 || businessRes.rows.length === 0) {
        return res.status(404).json({ error: "User or Business not found" });
      }

      const userInfo = userRes.rows[0];
      const businessInfo = businessRes.rows[0];

      console.log(
        `📩 CV Sent: ${userInfo.name} (${userInfo.email}) applied to ${businessInfo.business_name} (${businessInfo.business_email})`
      );

      return res.json({
        message: "Swipe recorded and CV sent (simulated)",
        swipe: result.rows[0],
        sent_to: businessInfo.business_name,
      });
    }

    res.json({
      message: "Swipe recorded",
      swipe: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /swipes/right
 * Body: { businessId, cv }
 * Handles right swipes with uploaded CV
 */
router.post("/right", authMiddleware, upload.single("cv"), async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ error: "Only users can swipe" });

    const { businessId } = req.body;
    const cvFile = req.file;

    if (!businessId || !cvFile) return res.status(400).json({ error: "Business ID and CV are required" });

    // Prevent duplicate swipes
    const existing = await pool.query(
      `SELECT * FROM swipes WHERE user_id = $1 AND business_id = $2`,
      [req.user.id, businessId]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: "You already swiped on this business" });

    // Insert swipe record
    const result = await pool.query(
      `INSERT INTO swipes (user_id, business_id, direction)
       VALUES ($1, $2, 'right') RETURNING id, created_at`,
      [req.user.id, businessId]
    );

    // Store CV path
    await pool.query(
      `INSERT INTO cvs (user_id, business_id, path) VALUES ($1, $2, $3)`,
      [req.user.id, businessId, cvFile.path]
    );

    console.log(`📩 CV uploaded and swipe recorded: User ${req.user.id} -> Business ${businessId}`);

    res.json({ message: "Swipe recorded and CV uploaded", swipe: result.rows[0], cvPath: cvFile.path });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /swipes/user
 * Returns businesses a user swiped right on
 */
router.get("/user", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ error: "Only users can view this" });

    const result = await pool.query(
      `SELECT b.id, b.business_name, b.owner_name, b.street, b.email, s.created_at
       FROM swipes s
       JOIN businesses b ON s.business_id = b.id
       WHERE s.user_id = $1 AND s.direction = 'right'
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /swipes/business
 * Returns users who swiped right on a business, with CV paths
 */
router.get("/business", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "business") return res.status(403).json({ error: "Only businesses can view this" });

    const result = await pool.query(
      `SELECT u.id, u.name, u.age, u.email, u.phone_number, s.created_at, c.path AS cv_path
       FROM swipes s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN cvs c ON c.user_id = u.id AND c.business_id = s.business_id
       WHERE s.business_id = $1 AND s.direction = 'right'
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
