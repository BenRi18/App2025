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
    // NOTE: `default: undefined` on both paths is load-bearing. Mongoose
    // defaults array paths to [], which would give every listing without a
    // location `geo: { coordinates: [] }` — and a 2dsphere index rejects that
    // ("Can't extract geo keys"), failing the insert entirely.
    geo: {
      type:        { type: String, enum: ["Point"], default: undefined },
      coordinates: { type: [Number], default: undefined },   // [lng, lat] — GeoJSON order!
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

// Sparse: listings without coordinates are omitted from the index rather than
// rejected, so a business can post before pinning a location.
jobListingSchema.index({ geo: "2dsphere" }, { sparse: true });

// Keep the GeoJSON mirror in sync on document saves
jobListingSchema.pre("save", function (next) {
  if (this.location?.lat != null && this.location?.lng != null) {
    this.geo = { type: "Point", coordinates: [this.location.lng, this.location.lat] };
  } else if (!this.geo?.coordinates?.length) {
    // Never persist a half-formed geo object — it breaks the 2dsphere index
    this.geo = undefined;
  }
  next();
});

const JobListing = mongoose.model("JobListing", jobListingSchema);
export default JobListing;
