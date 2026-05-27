// BackEnd/models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    match_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, index: true },
    sender_id:   { type: String, required: true },     // ObjectId string — user or business
    sender_role: { type: String, enum: ["user", "business"], required: true },
    content:     { type: String, required: true, maxlength: 1000 },
    read:        { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => { delete ret._id; delete ret.__v; },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
