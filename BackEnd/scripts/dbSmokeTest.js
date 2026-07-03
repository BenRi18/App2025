// BackEnd/scripts/dbSmokeTest.js
// End-to-end database smoke test for the trait-matching feature.
//
// Run from the BackEnd folder (uses your .env MONGODB_URI):
//     node scripts/dbSmokeTest.js
//
// It creates temporary test documents (clearly named __SMOKE_TEST__),
// exercises the full questionnaire → traits → ranking pipeline against
// the real database, verifies every step, and deletes everything it
// created — even if a step fails.

import dotenv   from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import { connectDB }          from "../db.js";
import User                   from "../models/User.js";
import Business               from "../models/Business.js";
import JobListing             from "../models/JobListing.js";
import Swipe                  from "../models/Swipe.js";
import { computeUserTraits }  from "../utils/traitMatch.js";
import { rankBusinessesForUser } from "../utils/matchScore.js";

const TAG = "__SMOKE_TEST__";
let pass = 0, fail = 0;

function check(label, condition, detail = "") {
  if (condition) { pass++; console.log(`  ✅ ${label}`); }
  else           { fail++; console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); }
}

async function main() {
  console.log("\n🔌 Connecting to MongoDB…");
  await connectDB();

  const created = { users: [], businesses: [], jobs: [], swipes: [] };

  try {
    // ── 1. Create test documents ──────────────────────────────────────────────
    console.log("\n1️⃣  Creating test documents");

    const user = await User.create({
      name: `${TAG} user`,
      email: `${TAG}.user.${Date.now()}@test.local`,
      password: "not-a-real-hash",
      work_type: "part-time",
      location: "Puerto del Carmen",
    });
    created.users.push(user._id);
    check("User created", !!user._id);

    const bizBar = await Business.create({
      business_name: `${TAG} Beach Bar`,
      owner_name: "Test Owner",
      email: `${TAG}.bar.${Date.now()}@test.local`,
      password: "not-a-real-hash",
      city: "Puerto del Carmen",
    });
    const bizClean = await Business.create({
      business_name: `${TAG} Apartments`,
      owner_name: "Test Owner",
      email: `${TAG}.apt.${Date.now()}@test.local`,
      password: "not-a-real-hash",
      city: "Puerto del Carmen",
    });
    created.businesses.push(bizBar._id, bizClean._id);
    check("Businesses created", !!bizBar._id && !!bizClean._id);

    const jobBar = await JobListing.create({
      business_id: bizBar._id,
      job_title: "Bartender for busy beach bar",
      job_type: "part-time",
      description: "High-energy weekend bar work",
    });
    const jobClean = await JobListing.create({
      business_id: bizClean._id,
      job_title: "Housekeeping staff",
      job_type: "part-time",
      description: "Cleaning and room preparation",
      archetype: "cleaning_housekeeping",           // tests explicit archetype storage
    });
    created.jobs.push(jobBar._id, jobClean._id);
    check("Job listings created", !!jobBar._id && !!jobClean._id);

    const jobReread = await JobListing.findById(jobClean._id);
    check("archetype field persisted", jobReread.archetype === "cleaning_housekeeping",
          `got: ${jobReread.archetype}`);

    // ── 2. Questionnaire write path (same logic as POST /questionnaire) ──────
    console.log("\n2️⃣  Saving questionnaire answers → traits");

    const answers = {
      free_time: "a", sports: "a", friends_role: "b", found_money: "a",
      pressure_response: "a", environment: "a", commitments: "a", task_style: "c",
    };
    const traits = computeUserTraits(answers);
    check("Trait vector computed", traits && Object.keys(traits).length > 0);

    await User.findByIdAndUpdate(user._id, { questionnaire_answers: answers, traits });

    // Re-read from the DB — proves Mongoose didn't strip the Object fields
    const userReread = await User.findById(user._id);
    check("questionnaire_answers persisted",
          userReread.questionnaire_answers?.free_time === "a");
    check("traits persisted",
          typeof userReread.traits?.energy === "number",
          `traits = ${JSON.stringify(userReread.traits)}`);
    check("traits survive toJSON (API responses)",
          typeof userReread.toJSON().traits?.energy === "number");

    // ── 3. Ranking read path (same pipeline as GET /businesses/nearby) ───────
    console.log("\n3️⃣  Ranking pipeline (as /businesses/nearby runs it)");

    const swipedIds = await Swipe.find({ user_id: user._id }).distinct("business_id");
    const businesses = await Business
      .find({ _id: { $in: created.businesses, $nin: swipedIds } })
      .select("-password");
    check("Businesses queried", businesses.length === 2, `got ${businesses.length}`);

    const jobListings = await JobListing
      .find({ business_id: { $in: created.businesses }, is_active: true })
      .sort({ createdAt: -1 });
    const jobMap = {};
    for (const j of jobListings) {
      const k = j.business_id.toString();
      if (!jobMap[k]) jobMap[k] = j;
    }

    const merged = businesses.map(b => ({
      ...b.toJSON(),
      job_listing: jobMap[b._id.toString()]?.toJSON() ?? null,
    }));

    const ranked = rankBusinessesForUser(userReread.toJSON(), merged);
    check("match_score present on results",
          ranked.every(b => typeof b.match_score === "number"));
    check("match_breakdown present on results",
          ranked.every(b => b.match_breakdown));

    const barResult = ranked.find(b => b.business_name.includes("Beach Bar"));
    const cleanResult = ranked.find(b => b.business_name.includes("Apartments"));
    check("High-energy user: bar scores above housekeeping",
          barResult.match_score > cleanResult.match_score,
          `bar=${barResult.match_score} vs housekeeping=${cleanResult.match_score}`);

    // ── 4. Swipe exclusion still works ────────────────────────────────────────
    console.log("\n4️⃣  Swipe exclusion");

    const swipe = await Swipe.create({
      user_id: user._id, business_id: bizBar._id, direction: "left",
    });
    created.swipes.push(swipe._id);

    const swipedIds2 = await Swipe.find({ user_id: user._id }).distinct("business_id");
    const remaining = await Business
      .find({ _id: { $in: created.businesses, $nin: swipedIds2 } });
    check("Swiped business excluded from deck",
          remaining.length === 1 &&
          remaining[0]._id.toString() === bizClean._id.toString());

  } catch (err) {
    fail++;
    console.error("\n💥 Unexpected error:", err.message);
  } finally {
    // ── 5. Cleanup — always runs ──────────────────────────────────────────────
    console.log("\n5️⃣  Cleaning up test documents");
    try {
      await Swipe.deleteMany({ _id: { $in: created.swipes } });
      await JobListing.deleteMany({ _id: { $in: created.jobs } });
      await Business.deleteMany({ _id: { $in: created.businesses } });
      await User.deleteMany({ _id: { $in: created.users } });

      // Safety net: remove anything tagged that a crashed earlier run left behind
      await User.deleteMany({ name: new RegExp(TAG) });
      await Business.deleteMany({ business_name: new RegExp(TAG) });
      console.log("  🧹 All test documents removed");
    } catch (err) {
      console.error("  ⚠️ Cleanup issue (check DB manually):", err.message);
    }

    await mongoose.connection.close();
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(fail === 0
    ? `🎉 ALL ${pass} CHECKS PASSED — database layer is healthy`
    : `⚠️  ${fail} FAILED, ${pass} passed — see ❌ lines above`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
