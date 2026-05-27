// BackEnd/models/JobListing.js
import mongoose from "mongoose";

const jobListingSchema = new mongoose.Schema(
  {
    // FK → Business
    business_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Business",
      required: true,
      index:    true,
    },

    // ── Step 3 registration ───────────────────────────────────────────────────
    job_title:    { type: String, required: true, maxlength: 150 },
    job_type:     { type: String, enum: ["full-time", "part-time", "casual"] },
    salary_range: { type: String, maxlength: 100 },
    description:  { type: String, maxlength: 1000 },   // stored as "description", aliased below

    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── toJSON transform ──────────────────────────────────────────────────────────
// Aliases `description` → `job_description` so the API shape matches the old
// PostgreSQL response that clients already expect.
jobListingSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.job_description = ret.description;
    delete ret.description;
    delete ret._id;
    delete ret.__v;
  },
});

const JobListing = mongoose.model("JobListing", jobListingSchema);
export default JobListing;
