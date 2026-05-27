// BackEnd/models/BusinessDecision.js
// Records a business's like/pass decision on a user who applied to them.
import mongoose from "mongoose";

const businessDecisionSchema = new mongoose.Schema(
  {
    business_id: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    decision:    { type: String, enum: ["like", "pass"], required: true },
  },
  { timestamps: true }
);

// A business can only decide once per user
businessDecisionSchema.index({ business_id: 1, user_id: 1 }, { unique: true });

businessDecisionSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => { delete ret._id; delete ret.__v; },
});

const BusinessDecision = mongoose.model("BusinessDecision", businessDecisionSchema);
export default BusinessDecision;
