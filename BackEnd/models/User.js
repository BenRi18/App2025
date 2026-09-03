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

    // ── Professional profile ──────────────────────────────────────────────────
    bio:       { type: String, maxlength: 600 },
    skills:    { type: [String], default: undefined },
    languages: { type: [String], default: undefined },
    education: { type: String, maxlength: 300 },
    work_history: {
      type: [
        {
          _id:      false,
          title:    { type: String, required: true, maxlength: 150 },
          company:  { type: String, maxlength: 150 },
          years:    { type: String, maxlength: 50 },
        },
      ],
      default: undefined,
    },
    cv_path: { type: String },

    // Last known device position (updated when the feed is fetched) — powers
    // proximity notifications worldwide.
    last_location: {
      lat: { type: Number, min: -90,  max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      at:  { type: Date },
    },

    // ── Learned preferences ───────────────────────────────────────────────────
    // Built from actual swipes (revealed preference), not the quiz. Each map
    // holds a score per key: >0.5 means "swipes right on these", <0.5 means
    // "swipes left". `signals` counts total swipes so the ranker can weight
    // this lightly at first and more heavily once there is real evidence.
    learned: {
      job_types:  { type: Map, of: Number, default: undefined },
      archetypes: { type: Map, of: Number, default: undefined },
      signals:    { type: Number, default: 0 },
    },

    // Businesses the user chose to hide — never shown in the feed again
    hidden_businesses: { type: [mongoose.Schema.Types.ObjectId], ref: "Business", default: undefined },

    // Archetypes the user asked to see less of ("not this kind of work")
    muted_archetypes: { type: [String], default: undefined },

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
