// BackEnd/scripts/backfillGeo.js — one-off after the worldwide-location update.
// Gives every existing job listing usable coordinates: from its own location,
// else its business's pinned location, else the legacy town table. Then the
// 2dsphere feed query can see all of them.
//
//   node scripts/backfillGeo.js   (run AFTER node scripts/syncIndexes.js)
//
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import JobListing from "../models/JobListing.js";
import Business from "../models/Business.js";
import { findTown } from "../utils/matchScore.js";

async function main() {
  await connectDB();

  const jobs = await JobListing.find({});
  let updated = 0, skipped = 0;

  for (const job of jobs) {
    let loc = job.location?.lat != null ? job.location : null;

    if (!loc) {
      const biz = await Business.findById(job.business_id).select("city location");
      if (biz?.location?.lat != null) {
        loc = { lat: biz.location.lat, lng: biz.location.lng, label: biz.location.label ?? biz.city };
      } else if (biz?.city) {
        const coords = findTown(biz.city.toLowerCase());
        if (coords) loc = { lat: coords[0], lng: coords[1], label: biz.city };
      }
    }

    if (!loc) { skipped++; continue; }

    await JobListing.updateOne(
      { _id: job._id },
      {
        location: loc,
        geo: { type: "Point", coordinates: [loc.lng, loc.lat] },
      }
    );
    updated++;
  }

  console.log(`✅  Geo backfill: ${updated} listings updated, ${skipped} without any location source`);
  await mongoose.connection.close();
  process.exit(0);
}
main().catch(err => { console.error("Backfill failed:", err); process.exit(1); });
