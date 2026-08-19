// BackEnd/models/Business.js
import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    role: { type: String, default: "business" },

    // ── Step 1 — required ─────────────────────────────────────────────────────
    business_name: { type: String, required: true, maxlength: 150 },
    owner_name:    { type: String, required: true, maxlength: 100 },
    email:         { type: String, required: true, unique: true, lowercase: true, maxlength: 255 },
    password:      { type: String, required: true },

    // ── Step 2 — location ─────────────────────────────────────────────────────
    street:      { type: String, maxlength: 255 },
    city:        { type: String, maxlength: 100 },
    postcode:    { type: String, maxlength: 20 },
    description: { type: String, maxlength: 500 },

    // ── Contact & company details ─────────────────────────────────────────────
    phone_number: { type: String, maxlength: 20 },
    website:      { type: String, maxlength: 255 },
    industry:     { type: String, maxlength: 100 },

    // Pinned coordinates of the premises — job listings inherit this when the
    // role has no location of its own. Captured on-device, works worldwide.
    location: {
      lat:   { type: Number, min: -90,  max: 90 },
      lng:   { type: Number, min: -180, max: 180 },
      label: { type: String, maxlength: 150 },
    },

    avatar_path:   { type: String },
    expoPushToken: { type: String },            // Expo push notification token

    // ── Email verification ────────────────────────────────────────────────────
    isEmailVerified:          { type: Boolean, default: false },
    emailVerificationToken:   { type: String,  select: false },
    emailVerificationExpires: { type: Date,    select: false },

    // ── Password reset ────────────────────────────────────────────────────────
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
  },
  { timestamps: true }
);

// ── toJSON transform ──────────────────────────────────────────────────────────
businessSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  },
});

const Business = mongoose.model("Business", businessSchema);
export default Business;
