// BackEnd/models/Swipe.js
import mongoose from "mongoose";

const swipeSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    business_id: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    // Optional — the specific job listing this swipe applies to. Older swipes
    // (and business-level swipes) have no job_id.
    job_id:      { type: mongoose.Schema.Types.ObjectId, ref: "JobListing" },
    direction:   { type: String, enum: ["left", "right"], required: true },
    // Application status — set to 'applied' on right-swipe; null for left-swipe.
    status: {
      type: String,
      enum: ["applied", "viewed", "shortlisted", "rejected", "hired"],
    },
  },
  { timestamps: true }
);

// A user can only swipe on a given business once
swipeSchema.index({ user_id: 1, business_id: 1, job_id: 1 }, { unique: true });

swipeSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
  },
});

const Swipe = mongoose.model("Swipe", swipeSchema);
export default Swipe;
