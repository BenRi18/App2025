// BackEnd/routes/auth.js
import express    from "express";
import bcrypt     from "bcrypt";
import jwt        from "jsonwebtoken";
import crypto     from "crypto";
import nodemailer from "nodemailer";
import { body, validationResult } from "express-validator";

import User          from "../models/User.js";
import Business      from "../models/Business.js";
import JobListing    from "../models/JobListing.js";
import RefreshToken  from "../models/RefreshToken.js";
import authMiddleware        from "../middleware/auth.js";
import { makeRateLimiter }  from "../middleware/rateLimiter.js";
import fs from "fs";
import { uploadAvatar, uploadCV, filePath, deleteFile } from "../middleware/upload.js";
import Match            from "../models/Match.js";
import Message          from "../models/Message.js";
import Swipe            from "../models/Swipe.js";
import BusinessDecision from "../models/BusinessDecision.js";
import CV               from "../models/CV.js";

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Email verification is only enforced when EMAIL_USER is configured.
// In development (no EMAIL_USER) accounts are auto-verified and tokens are logged to console.
const EMAIL_ENABLED = !!process.env.EMAIL_USER;

// ─── Rate limiters ────────────────────────────────────────────────────────────
const loginLimiter        = makeRateLimiter(10, 15 * 60 * 1000);
const registerLimiter     = makeRateLimiter(5,  60 * 60 * 1000);
const forgotLimiter       = makeRateLimiter(5,  60 * 60 * 1000);
const resendLimiter       = makeRateLimiter(3,  60 * 60 * 1000);

// ─── Token helpers ────────────────────────────────────────────────────────────
/**
 * Issues an access token (15 min) + refresh token (30 days).
 * Stores a SHA-256 hash of the refresh token in the DB.
 * Returns { token, refreshToken }.
 */
async function generateTokens(id, role) {
  const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "15m" });

  const rawRefresh  = crypto.randomBytes(64).toString("hex");
  const refreshHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");

  await RefreshToken.create({
    user_id:    id,
    role,
    token_hash: refreshHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return { token, refreshToken: rawRefresh };
}

// ─── Email sender ─────────────────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp.gmail.com",
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_PORT === "465",
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return _transporter;
}

async function sendEmail(to, subject, html) {
  if (!EMAIL_ENABLED) return;
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to, subject, html,
  });
}

// ─── Validator helper ─────────────────────────────────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    return false;
  }
  return true;
};

// ─── Valid enum sets ──────────────────────────────────────────────────────────
const VALID_WORK_TYPES   = ["full-time", "part-time", "casual", "any"];
const VALID_EXPERIENCE   = ["no-experience", "some-experience", "experienced", "expert"];
const VALID_AVAILABILITY = ["immediately", "within-a-week", "within-a-month", "not-sure"];
const VALID_TRAVEL       = ["5km", "10km", "25km", "any"];
const VALID_JOB_TYPES    = ["full-time", "part-time", "casual"];
const VALID_INDUSTRIES   = [
  "hospitality", "retail", "logistics", "healthcare", "admin",
  "construction", "tech", "education", "finance", "security",
];

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/register",
  registerLimiter,
  [
    body("role").isIn(["user", "business"]).withMessage("Role must be 'user' or 'business'"),

    body("email")
      .trim().normalizeEmail({ gmail_remove_dots: false })
      .isEmail()              .withMessage("A valid email address is required")
      .isLength({ max: 255 }).withMessage("Email must be under 255 characters"),

    body("password")
      .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters")
      .matches(/[a-zA-Z]/)           .withMessage("Password must contain at least one letter")
      .matches(/\d/)                 .withMessage("Password must contain at least one number"),

    // User-only
    body("name")
      .if(body("role").equals("user")).trim().notEmpty().withMessage("Name is required")
      .isLength({ min: 2, max: 100 }) .withMessage("Name must be 2–100 characters")
      .matches(/^[a-zA-Z\s'\-\.]+$/) .withMessage("Name can only contain letters, spaces, hyphens, apostrophes or dots"),

    body("age").optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 16, max: 100 }).withMessage("Age must be between 16 and 100"),

    body("phone_number").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ min: 7, max: 20 })      .withMessage("Phone must be 7–20 characters")
      .matches(/^[\+]?[\d\s\-\(\)\.]+$/) .withMessage("Phone number contains invalid characters"),

    body("location").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 150 }).withMessage("Location must be under 150 characters"),

    body("work_type").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_WORK_TYPES).withMessage("Invalid work type"),

    body("experience_level").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_EXPERIENCE).withMessage("Invalid experience level"),

    body("availability").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_AVAILABILITY).withMessage("Invalid availability value"),

    body("travel_distance").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_TRAVEL).withMessage("Invalid travel distance"),

    body("industry_preference").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 200 }).withMessage("Industry preference too long")
      .custom((val) => {
        if (!val) return true;
        const items = val.split(",").map(s => s.trim()).filter(Boolean);
        if (items.length > 10) throw new Error("Too many industries selected");
        for (const item of items) {
          if (!VALID_INDUSTRIES.includes(item)) throw new Error(`Invalid industry: "${item}"`);
        }
        return true;
      }),

    // Business-only
    body("business_name")
      .if(body("role").equals("business")).trim().notEmpty().withMessage("Business name is required")
      .isLength({ min: 2, max: 150 }).withMessage("Business name must be 2–150 characters"),

    body("owner_name")
      .if(body("role").equals("business")).trim().notEmpty().withMessage("Owner name is required")
      .isLength({ min: 2, max: 100 })  .withMessage("Owner name must be 2–100 characters")
      .matches(/^[a-zA-Z\s'\-\.]+$/)  .withMessage("Owner name can only contain letters, spaces, hyphens, apostrophes or dots"),

    body("street").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 255 }).withMessage("Street must be under 255 characters"),

    body("city").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 100 })          .withMessage("City must be under 100 characters")
      .matches(/^[a-zA-Z\s\-\.]+$/)   .withMessage("City can only contain letters, spaces, hyphens or dots"),

    body("postcode").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 20 })           .withMessage("Postcode must be under 20 characters")
      .matches(/^[a-zA-Z0-9\s\-]+$/) .withMessage("Postcode can only contain letters, numbers, spaces or hyphens"),

    body("description").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 500 }).withMessage("Description must be under 500 characters"),

    body("job_title").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ min: 2, max: 150 }).withMessage("Job title must be 2–150 characters"),

    body("job_type").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_JOB_TYPES).withMessage("Invalid job type"),

    body("salary_range").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 100 }).withMessage("Salary range must be under 100 characters"),

    body("job_description").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 1000 }).withMessage("Job description must be under 1000 characters"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const {
        role, email, password,
        name, age, phone_number, location,
        work_type, experience_level, availability, travel_distance, industry_preference,
        business_name, owner_name, street, city, postcode, description,
        job_title, job_type, salary_range, job_description,
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      // Verification token (only needed when email is enabled)
      const rawVerify    = EMAIL_ENABLED ? crypto.randomBytes(32).toString("hex") : undefined;
      const verifyHash   = rawVerify ? crypto.createHash("sha256").update(rawVerify).digest("hex") : undefined;
      const verifyExpiry = rawVerify ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined; // 24 h

      let docId;

      if (role === "user") {
        const user = await User.create({
          name, email, password: hashedPassword,
          age: age ?? undefined, phone_number: phone_number ?? undefined,
          location: location ?? undefined,
          work_type: work_type ?? undefined, experience_level: experience_level ?? undefined,
          availability: availability ?? undefined, travel_distance: travel_distance ?? undefined,
          industry_preference: industry_preference ?? undefined,
          isEmailVerified:          !EMAIL_ENABLED,
          emailVerificationToken:   verifyHash,
          emailVerificationExpires: verifyExpiry,
        });
        docId = user._id.toString();
      } else {
        const biz = await Business.create({
          business_name, owner_name, email, password: hashedPassword,
          street: street ?? undefined, city: city ?? undefined,
          postcode: postcode ?? undefined, description: description ?? undefined,
          isEmailVerified:          !EMAIL_ENABLED,
          emailVerificationToken:   verifyHash,
          emailVerificationExpires: verifyExpiry,
        });
        docId = biz._id.toString();
        if (job_title) {
          await JobListing.create({
            business_id: biz._id, job_title,
            job_type: job_type ?? undefined, salary_range: salary_range ?? undefined,
            description: job_description ?? undefined,
          });
        }
      }

      // ── Email verification required (production) ───────────────────────────
      if (EMAIL_ENABLED) {
        const verifyLink =
          `${process.env.APP_RESET_URL?.replace("reset-password", "verify-email") || "myapp://verify-email"}` +
          `?token=${rawVerify}&email=${encodeURIComponent(email)}&role=${role}`;

        await sendEmail(email, "Verify your email — JobSwipe", `
          <p>Hi${name ? " " + name : ""},</p>
          <p>Thanks for signing up! Please verify your email address to get started.</p>
          <p><a href="${verifyLink}">Verify my email</a></p>
          <p>This link expires in 24 hours.</p>
        `);

        return res.status(201).json({
          requiresVerification: true,
          message: "Account created. Please check your email to verify before logging in.",
        });
      }

      // ── Dev mode — auto-verified, issue tokens immediately ─────────────────
      const tokens = await generateTokens(docId, role);
      res.status(201).json({ ...tokens, role });

    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/verify-email?token=x&email=x&role=x
// ─────────────────────────────────────────────────────────────────────────────
router.get("/verify-email", async (req, res, next) => {
  try {
    const { token, email, role } = req.query;
    if (!token || !email || !role) {
      return res.status(400).json({ error: "token, email and role are required" });
    }

    const Model = role === "user" ? User : Business;
    const hash  = crypto.createHash("sha256").update(token).digest("hex");

    const account = await Model.findOne({
      email: email.toLowerCase(),
      emailVerificationToken:   hash,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!account) {
      return res.status(400).json({ error: "Verification link is invalid or has expired. Please request a new one." });
    }

    account.isEmailVerified          = true;
    account.emailVerificationToken   = undefined;
    account.emailVerificationExpires = undefined;
    await account.save();

    const tokens = await generateTokens(account._id.toString(), role);
    res.json({ ...tokens, role, message: "Email verified successfully." });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/resend-verification",
  resendLimiter,
  [
    body("role").isIn(["user", "business"]).withMessage("Role is required"),
    body("email").trim().normalizeEmail({ gmail_remove_dots: false })
      .isEmail().withMessage("A valid email is required"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const { email, role } = req.body;
      const okMsg = { message: "If that email is registered and unverified, a new link has been sent." };

      const Model   = role === "user" ? User : Business;
      const account = await Model.findOne({ email, isEmailVerified: false })
        .select("+emailVerificationToken +emailVerificationExpires");

      if (!account) return res.json(okMsg);

      const rawVerify  = crypto.randomBytes(32).toString("hex");
      const verifyHash = crypto.createHash("sha256").update(rawVerify).digest("hex");

      account.emailVerificationToken   = verifyHash;
      account.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await account.save();

      const verifyLink =
        `${process.env.APP_RESET_URL?.replace("reset-password", "verify-email") || "myapp://verify-email"}` +
        `?token=${rawVerify}&email=${encodeURIComponent(email)}&role=${role}`;

      if (!EMAIL_ENABLED) {
        console.log(`🔗 Resend verify: ${verifyLink}`);
      } else {
        await sendEmail(email, "Verify your email — JobSwipe", `
          <p>Here is your new verification link:</p>
          <p><a href="${verifyLink}">Verify my email</a></p>
          <p>Expires in 24 hours.</p>
        `);
      }

      res.json(okMsg);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/login",
  loginLimiter,
  [
    body("role").isIn(["user", "business"]).withMessage("Role must be 'user' or 'business'"),
    body("email").trim().normalizeEmail({ gmail_remove_dots: false })
      .isEmail().withMessage("A valid email address is required"),
    body("password").notEmpty().withMessage("Password is required")
      .isLength({ max: 128 }).withMessage("Password too long"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const { role, email, password } = req.body;
      const Model      = role === "user" ? User : Business;
      const invalidMsg = "Invalid email or password"; // generic to prevent enumeration

      const account = await Model.findOne({ email }).select("+password");
      if (!account) return res.status(401).json({ error: invalidMsg });

      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) return res.status(401).json({ error: invalidMsg });

      if (!account.isEmailVerified) {
        return res.status(403).json({
          error: "Please verify your email before logging in.",
          requiresVerification: true,
        });
      }

      const tokens = await generateTokens(account._id.toString(), role);
      res.json({ ...tokens, role });

    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh  — issue a new access token from a valid refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

    const hash    = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const stored  = await RefreshToken.findOne({ token_hash: hash, expires_at: { $gt: Date.now() } });

    if (!stored) return res.status(401).json({ error: "Invalid or expired refresh token. Please log in again." });

    // Token rotation — delete old, issue new pair
    await RefreshToken.deleteOne({ _id: stored._id });
    const tokens = await generateTokens(stored.user_id, stored.role);

    res.json({ ...tokens, role: stored.role });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout  — invalidate refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      await RefreshToken.deleteOne({ token_hash: hash });
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === "user") {
      const user = await User.findById(id).select("-password");
      if (!user) return res.status(404).json({ error: "Account not found" });
      return res.json({ ...user.toJSON(), role });
    } else {
      const biz = await Business.findById(id).select("-password");
      if (!biz) return res.status(404).json({ error: "Account not found" });
      const job = await JobListing
        .findOne({ business_id: biz._id, is_active: true })
        .sort({ createdAt: -1 });
      return res.json({ ...biz.toJSON(), role, job_listing: job ? job.toJSON() : null });
    }
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/avatar
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/avatar",
  authMiddleware,
  uploadAvatar.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image file received" });
      const { id, role } = req.user;
      const Model  = role === "user" ? User : Business;
      const stored = filePath(req.file);
      await Model.updateOne({ _id: id }, { avatar_path: stored });
      res.json({ avatar_path: stored });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/push-token  — save Expo push token for the device
// ─────────────────────────────────────────────────────────────────────────────
router.post("/push-token", authMiddleware, async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    if (!expoPushToken) return res.status(400).json({ error: "expoPushToken is required" });

    const Model = req.user.role === "user" ? User : Business;
    await Model.updateOne({ _id: req.user.id }, { expoPushToken });

    res.json({ message: "Push token saved" });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /auth/me  — update profile
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/me",
  authMiddleware,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty")
      .isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters")
      .matches(/^[a-zA-Z\s'\-\.]+$/).withMessage("Name contains invalid characters"),

    body("age").optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 16, max: 100 }).withMessage("Age must be 16–100"),

    body("phone_number").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ min: 7, max: 20 })      .withMessage("Phone must be 7–20 characters")
      .matches(/^[\+]?[\d\s\-\(\)\.]+$/) .withMessage("Phone contains invalid characters"),

    body("location").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 150 }).withMessage("Location must be under 150 characters"),

    body("work_type").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_WORK_TYPES).withMessage("Invalid work type"),

    body("experience_level").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_EXPERIENCE).withMessage("Invalid experience level"),

    body("availability").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_AVAILABILITY).withMessage("Invalid availability value"),

    body("travel_distance").optional({ nullable: true, checkFalsy: true })
      .isIn(VALID_TRAVEL).withMessage("Invalid travel distance"),

    body("industry_preference").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 200 }).withMessage("Industry preference too long")
      .custom((val) => {
        if (!val) return true;
        const items = val.split(",").map(s => s.trim()).filter(Boolean);
        if (items.length > 10) throw new Error("Too many industries selected");
        for (const item of items) {
          if (!VALID_INDUSTRIES.includes(item)) throw new Error(`Invalid industry: "${item}"`);
        }
        return true;
      }),

    body("business_name").optional().trim().notEmpty().withMessage("Business name cannot be empty")
      .isLength({ min: 2, max: 150 }).withMessage("Business name must be 2–150 characters"),

    body("owner_name").optional().trim().notEmpty().withMessage("Owner name cannot be empty")
      .isLength({ min: 2, max: 100 })  .withMessage("Owner name must be 2–100 characters")
      .matches(/^[a-zA-Z\s'\-\.]+$/)  .withMessage("Owner name contains invalid characters"),

    body("street").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 255 }).withMessage("Street must be under 255 characters"),

    body("city").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 100 })         .withMessage("City must be under 100 characters")
      .matches(/^[a-zA-Z\s\-\.]+$/)  .withMessage("City contains invalid characters"),

    body("postcode").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 20 })          .withMessage("Postcode must be under 20 characters")
      .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage("Postcode contains invalid characters"),

    body("description").optional({ nullable: true, checkFalsy: true }).trim()
      .isLength({ max: 500 }).withMessage("Description must be under 500 characters"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const { id, role } = req.user;

      if (role === "user") {
        const ALLOWED = ["name","age","phone_number","location","work_type",
          "experience_level","availability","travel_distance","industry_preference"];
        const updates = {};
        for (const key of ALLOWED) {
          if (req.body[key] !== undefined) updates[key] = req.body[key] || undefined;
        }
        const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password");
        if (!user) return res.status(404).json({ error: "Account not found" });
        return res.json({ ...user.toJSON(), role });
      } else {
        const ALLOWED = ["business_name","owner_name","street","city","postcode","description"];
        const updates = {};
        for (const key of ALLOWED) {
          if (req.body[key] !== undefined) updates[key] = req.body[key] || undefined;
        }
        const biz = await Business.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password");
        if (!biz) return res.status(404).json({ error: "Account not found" });
        return res.json({ ...biz.toJSON(), role });
      }
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /auth/password  — change password while logged in
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  "/password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8, max: 128 }).withMessage("New password must be 8–128 characters")
      .matches(/[a-zA-Z]/)             .withMessage("New password must contain at least one letter")
      .matches(/\d/)                   .withMessage("New password must contain at least one number"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const { id, role } = req.user;
      const { currentPassword, newPassword } = req.body;
      const Model   = role === "user" ? User : Business;
      const account = await Model.findById(id).select("+password");
      if (!account) return res.status(404).json({ error: "Account not found" });
      const isMatch = await bcrypt.compare(currentPassword, account.password);
      if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });
      account.password = await bcrypt.hash(newPassword, 12);
      await account.save();
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/forgot-password",
  forgotLimiter,
  [
    body("role").isIn(["user", "business"]).withMessage("Role is required"),
    body("email").trim().normalizeEmail({ gmail_remove_dots: false })
      .isEmail().withMessage("A valid email is required"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const { email, role } = req.body;
      const Model   = role === "user" ? User : Business;
      const okMsg   = { message: "If that email is registered you will receive a reset link shortly." };
      const account = await Model.findOne({ email })
        .select("+passwordResetToken +passwordResetExpires");
      if (!account) return res.json(okMsg);

      const rawToken    = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      account.passwordResetToken   = hashedToken;
      account.passwordResetExpires = Date.now() + 60 * 60 * 1000;
      await account.save();

      const resetLink =
        `${process.env.APP_RESET_URL || "myapp://reset-password"}` +
        `?token=${rawToken}&email=${encodeURIComponent(email)}&role=${role}`;

      if (!EMAIL_ENABLED) {
        console.log("─────────────────────────────────────────────");
        console.log(`🔑 Password reset for ${email}: ${rawToken}`);
        console.log(`🔗 ${resetLink}`);
        console.log("─────────────────────────────────────────────");
      } else {
        await sendEmail(email, "Password Reset — JobSwipe", `
          <p>You requested a password reset.</p>
          <p><a href="${resetLink}">Reset my password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        `);
      }

      res.json(okMsg);
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/reset-password",
  [
    body("role").isIn(["user", "business"]).withMessage("Role is required"),
    body("email").trim().normalizeEmail({ gmail_remove_dots: false })
      .isEmail().withMessage("A valid email is required"),
    body("token").notEmpty().withMessage("Token is required"),
    body("newPassword")
      .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters")
      .matches(/[a-zA-Z]/)             .withMessage("Must contain a letter")
      .matches(/\d/)                   .withMessage("Must contain a number"),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const { email, role, token, newPassword } = req.body;
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const Model       = role === "user" ? User : Business;
      const account     = await Model.findOne({
        email,
        passwordResetToken:   hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select("+passwordResetToken +passwordResetExpires +password");

      if (!account) {
        return res.status(400).json({ error: "Reset link is invalid or expired. Please request a new one." });
      }

      account.password             = await bcrypt.hash(newPassword, 12);
      account.passwordResetToken   = undefined;
      account.passwordResetExpires = undefined;
      await account.save();

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
      next(err);
    }
  }
);


// ─── POST /auth/me/cv ─────────────────────────────────────────────────────────
// Store (or replace) the user's default CV. Uploaded once, used for every
// application until replaced or removed.
router.post("/me/cv", authMiddleware, uploadCV.single("cv"), async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users have a CV" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "CV file is required" });
    }

    const me = await User.findById(req.user.id).select("cv_path");
    const stored = filePath(req.file);

    // Best-effort cleanup of the previous file
    if (me?.cv_path && me.cv_path !== stored) {
      deleteFile(me.cv_path);
    }

    await User.updateOne({ _id: req.user.id }, { cv_path: stored });
    res.json({ cv_path: stored });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /auth/me/cv ───────────────────────────────────────────────────────
router.delete("/me/cv", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ error: "Only users have a CV" });
    }
    const me = await User.findById(req.user.id).select("cv_path");
    if (me?.cv_path) {
      deleteFile(me.cv_path);
      await User.updateOne({ _id: req.user.id }, { $unset: { cv_path: 1 } });
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});


// ─── PUT /auth/me/location ────────────────────────────────────────────────────
// Pin the account's coordinates (captured on-device — works worldwide).
// Businesses: premises location, inherited by job listings without their own.
router.put("/me/location", authMiddleware, async (req, res, next) => {
  try {
    const lat = Number(req.body.lat), lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Valid lat and lng are required" });
    }
    const label = typeof req.body.label === "string" ? req.body.label.slice(0, 150) : undefined;

    const Model = req.user.role === "business" ? Business : User;
    const field = req.user.role === "business"
      ? { location: { lat, lng, label } }
      : { last_location: { lat, lng, at: new Date() } };

    await Model.updateOne({ _id: req.user.id }, field);
    res.json({ pinned: true, lat, lng, label: label ?? null });
  } catch (err) {
    next(err);
  }
});


// ─── DELETE /auth/me ──────────────────────────────────────────────────────────
// Permanent account deletion (GDPR erasure + App Store requirement).
// Removes the account and everything attached: matches and their messages,
// swipes, decisions, CV records and stored files, avatar, refresh tokens,
// and — for businesses — every job listing they posted.
// Requires the current password in the body as confirmation.
router.delete(
  "/me",
  authMiddleware,
  [body("password").notEmpty().withMessage("Password confirmation is required")],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const { role, id } = req.user;
      const Model = role === "user" ? User : Business;

      const account = await Model.findById(id).select("+password");
      if (!account) return res.status(404).json({ error: "Account not found" });

      const ok = await bcrypt.compare(req.body.password, account.password);
      if (!ok) return res.status(401).json({ error: "Incorrect password" });

      const key = role === "user" ? "user_id" : "business_id";

      // Messages hang off matches — collect those ids first
      const matchIds = (await Match.find({ [key]: id }).select("_id")).map(m => m._id);

      // Remove stored files (works for both S3/R2 and local disk)
      const cvs = await CV.find({ [key]: id }).select("path");
      await Promise.all(cvs.map(c => deleteFile(c.path)));
      if (role === "user" && account.cv_path) await deleteFile(account.cv_path);
      if (account.avatar_path) await deleteFile(account.avatar_path);

      await Promise.all([
        Message.deleteMany({ match_id: { $in: matchIds } }),
        Match.deleteMany({ [key]: id }),
        Swipe.deleteMany({ [key]: id }),
        BusinessDecision.deleteMany({ [key]: id }),
        CV.deleteMany({ [key]: id }),
        RefreshToken.deleteMany({ user_id: id }),
        role === "business"
          ? JobListing.deleteMany({ business_id: id })
          : Promise.resolve(),
      ]);

      await Model.findByIdAndDelete(id);
      console.log(`🗑️  Account deleted: ${role} ${id} (${matchIds.length} matches, ${cvs.length} CVs)`);
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
