// BackEnd/scripts/syncIndexes.js — run ONCE after deploying model changes.
// Drops stale indexes and builds the ones defined in the schemas.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import Swipe            from "../models/Swipe.js";
import BusinessDecision from "../models/BusinessDecision.js";
import Match            from "../models/Match.js";
import User             from "../models/User.js";
import Business         from "../models/Business.js";
import JobListing       from "../models/JobListing.js";

async function main() {
  await connectDB();
  for (const model of [Swipe, BusinessDecision, Match, User, Business, JobListing]) {
    const dropped = await model.syncIndexes();
    console.log(`${model.modelName}: dropped [${dropped.join(", ") || "none"}]`);
  }
  await mongoose.connection.close();
  console.log("✅  Index sync complete");
  process.exit(0);
}
main().catch(err => { console.error("Index sync failed:", err); process.exit(1); });
