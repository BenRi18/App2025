// BackEnd/models/Match.js
// Created when a user right-swipes a business AND the business likes the user back.
import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    business_id: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    // Optional — the job listing this match was made for.
    job_id:      { type: mongoose.Schema.Types.ObjectId, ref: "JobListing" },

    // Chat convenience fields — updated on each message
    last_message:    { type: String },
    last_message_at: { type: Date },
    unread_user:     { type: Number, default: 0 },    // unread count for the user
    unread_business: { type: Number, default: 0 },    // unread count for the business
  },
  { timestamps: true }
);

// A user can only match with a business once
matchSchema.index({ user_id: 1, business_id: 1, job_id: 1 }, { unique: true });

matchSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => { delete ret._id; delete ret.__v; },
});

const Match = mongoose.model("Match", matchSchema);
export default Match;
