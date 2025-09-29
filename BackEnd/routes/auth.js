// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ✅ Register endpoint
router.post(
  "/register",
  [
    body("role").isIn(["user", "business"]).withMessage("Role must be user or business"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, email, password, name, age, phone_number, business_name, owner_name, street } =
        req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      let result;
      if (role === "user") {
        result = await pool.query(
          `INSERT INTO users (name, age, email, phone_number, password)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [name, age, email, phone_number, hashedPassword]
        );
      } else {
        result = await pool.query(
          `INSERT INTO businesses (business_name, owner_name, street, email, password)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [business_name, owner_name, street, email, hashedPassword]
        );
      }

      res.json({ id: result.rows[0].id, role });
    } catch (err) {
      next(err);
    }
  }
);

// ✅ Login endpoint
router.post(
  "/login",
  [
    body("role").isIn(["user", "business"]).withMessage("Role must be user or business"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").exists().withMessage("Password required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, email, password } = req.body;
      const table = role === "user" ? "users" : "businesses";

      const result = await pool.query(`SELECT * FROM ${table} WHERE email = $1`, [email]);
      if (result.rows.length === 0) return res.status(400).json({ error: "Account not found" });

      const account = result.rows[0];
      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: account.id, role }, JWT_SECRET, { expiresIn: "1h" });

      res.json({ token });
    } catch (err) {
      next(err);
    }
  }
);

// ✅ Authenticated "me" route
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const table = role === "user" ? "users" : "businesses";

    const result = await pool.query(
      `SELECT id, email, role, ${
        role === "user" ? "name, age, phone_number" : "business_name, owner_name, street"
      } FROM ${table} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
