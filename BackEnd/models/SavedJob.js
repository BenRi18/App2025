// BackEnd/models/SavedJob.js
// A job the user shortlisted — "interested, but not ready to apply yet".
// Doubles as a strong positive signal for feed learning.
import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User",       required: true },
    job_id:  { type: mongoose.Schema.Types.ObjectId, ref: "JobListing", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id; delete ret.__v;
        return ret;
      },
    },
  }
);

savedJobSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

export default mongoose.model("SavedJob", savedJobSchema);
