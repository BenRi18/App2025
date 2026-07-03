// BackEnd/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, default: "user" },

    // ── Step 1 — required ─────────────────────────────────────────────────────
    name:     { type: String, required: true, maxlength: 100 },
    email:    { type: String, required: true, unique: true, lowercase: true, maxlength: 255 },
    password: { type: String, required: true },

    // ── Step 2 — optional ─────────────────────────────────────────────────────
    age:          { type: Number, min: 16, max: 100 },
    phone_number: { type: String, maxlength: 20 },
    location:     { type: String, maxlength: 150 },

    // ── Step 3 — work preferences ─────────────────────────────────────────────
    work_type:           { type: String, enum: ["full-time", "part-time", "casual", "any"] },
    experience_level:    { type: String, enum: ["no-experience", "some-experience", "experienced", "expert"] },
    availability:        { type: String, enum: ["immediately", "within-a-week", "within-a-month", "not-sure"] },
    travel_distance:     { type: String, enum: ["5km", "10km", "25km", "any"] },
    industry_preference: { type: String, maxlength: 200 },

    // ── Lifestyle questionnaire (trait-based matching) ────────────────────────
    questionnaire_answers: { type: Object },   // { free_time: "a", sports: "c", ... }
    traits:                { type: Object },   // computed vector { energy: 0.8, ... }

    avatar_path:    { type: String },
    expoPushToken:  { type: String },           // Expo push notification token

    // ── Email verification ────────────────────────────────────────────────────
    isEmailVerified:          { type: Boolean, default: false },
    emailVerificationToken:   { type: String,  select: false },
    emailVerificationExpires: { type: Date,    select: false },

    // ── Password reset ────────────────────────────────────────────────────────
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
  },
  { timestamps: true }   // adds createdAt + updatedAt automatically
);

// ── toJSON transform ──────────────────────────────────────────────────────────
// Adds virtual `id` (string), removes _id / __v / password from API responses.
userSchema.set("toJSON", {
  virtuals: true,         // includes built-in `id` virtual (= _id.toString())
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;  // never expose the hash
  },
});

const User = mongoose.model("User", userSchema);
export default User;
