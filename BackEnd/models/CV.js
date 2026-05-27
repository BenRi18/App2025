// BackEnd/models/CV.js
import mongoose from "mongoose";

const cvSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    business_id: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    path:        { type: String, required: true },
  },
  { timestamps: true }
);

cvSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
  },
});

const CV = mongoose.model("CV", cvSchema);
export default CV;
