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

    // Trait-matching archetype, e.g. 'bar_service' — see config/questionnaire.js
    archetype: { type: String },

    // Chosen card backdrop id (see FrontEnd/constants/backdrops.js). Just an
    // id — the palette and motif live in the app, so nothing is uploaded.
    backdrop: { type: String, maxlength: 40 },

    // Per-listing role questionnaire answers (business declares what the role
    // needs). Raw answers stored; the trait target is derived at match time.
    role_answers: {
      type: [
        {
          _id:        false,
          questionId: { type: String, required: true },
          optionId:   { type: String, required: true },
        },
      ],
      default: undefined,
    },

    // Precise place of work for this role — proximity matching + map display.
    // Defaults to the business's town when not set explicitly.
    location: {
      lat:   { type: Number, min: -90,  max: 90 },
      lng:   { type: Number, min: -180, max: 180 },
      label: { type: String, maxlength: 150 },
    },

    // GeoJSON mirror of `location` — powers worldwide $near proximity queries.
    // Maintained automatically; never set directly.
    geo: {
      type:        { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },   // [lng, lat] — GeoJSON order!
    },

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

jobListingSchema.index({ geo: "2dsphere" });

// Keep the GeoJSON mirror in sync on document saves
jobListingSchema.pre("save", function (next) {
  if (this.location?.lat != null && this.location?.lng != null) {
    this.geo = { type: "Point", coordinates: [this.location.lng, this.location.lat] };
  }
  next();
});

const JobListing = mongoose.model("JobListing", jobListingSchema);
export default JobListing;
