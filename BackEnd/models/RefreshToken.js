// BackEnd/models/RefreshToken.js
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  // Stored as a plain string — could be a User or Business _id
  user_id:    { type: String, required: true, index: true },
  role:       { type: String, required: true },
  // SHA-256 hash of the raw token (we never store the raw value)
  token_hash: { type: String, required: true, unique: true },
  expires_at: { type: Date,   required: true },
});

// MongoDB TTL index — auto-removes expired documents from the collection
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
