// BackEnd/utils/traitMatch.js
// Turns questionnaire answers into a user trait vector, and compares it
// against a job's archetype profile to produce a 0–1 compatibility score.

import { TRAITS, QUESTIONS, JOB_ARCHETYPES } from "../config/questionnaire.js";

/**
 * Build a user's trait vector from their questionnaire answers.
 *
 * @param {Object} answers  e.g. { free_time: "a", sports: "c", ... }
 * @returns {Object|null}   e.g. { energy: 0.85, social: 0.6, ... } averaged
 *                          per trait, or null if no valid answers.
 */
export function computeUserTraits(answers) {
  if (!answers || typeof answers !== "object") return null;

  const sums = {}, counts = {};

  for (const q of QUESTIONS) {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    if (!chosen) continue;

    for (const [trait, value] of Object.entries(chosen.traits)) {
      sums[trait]   = (sums[trait]   ?? 0) + value;
      counts[trait] = (counts[trait] ?? 0) + 1;
    }
  }

  if (Object.keys(sums).length === 0) return null;

  const vector = {};
  for (const t of TRAITS) {
    if (counts[t]) vector[t] = +(sums[t] / counts[t]).toFixed(3);
  }
  return vector;
}

/**
 * Compatibility between a user trait vector and a job archetype (0–1).
 *
 * For each trait the job cares about, closeness = 1 - |user - job|,
 * weighted by how much the job cares (the archetype value itself).
 * Traits the archetype omits are ignored — a quiet job doesn't punish
 * a sociable person, and vice versa, unless the archetype says so.
 *
 * @param {Object|null} userTraits   from computeUserTraits()
 * @param {string|Object} archetype  archetype key or a raw traits object
 * @returns {number} 0–1 (0.5 neutral when data is missing)
 */
export function traitCompatibility(userTraits, archetype) {
  if (!userTraits) return 0.5;                       // user skipped the quiz

  const jobTraits =
    typeof archetype === "string"
      ? JOB_ARCHETYPES[archetype]?.traits
      : archetype?.traits ?? archetype;

  if (!jobTraits || Object.keys(jobTraits).length === 0) return 0.5;

  let weighted = 0, totalWeight = 0;

  // 'routine' is a two-way preference (chaos-lover suffers in a routine job
  // AND vice versa). Every other trait is a minimum requirement — having
  // MORE energy/responsibility than the job needs is never a downside.
  const SYMMETRIC = new Set(["routine"]);

  for (const [trait, jobValue] of Object.entries(jobTraits)) {
    // Missing user data = neutral 0.5, not a free pass — otherwise a user
    // who never answered routine-related questions aces every routine job.
    const userValue = userTraits[trait] ?? 0.5;

    let closeness;
    if (SYMMETRIC.has(trait)) {
      closeness = Math.pow(1 - Math.abs(userValue - jobValue), 2);
    } else if (userValue >= jobValue) {
      closeness = 1.0;                               // meets or exceeds the bar
    } else {
      // Squared shortfall spreads scores: a small gap costs little,
      // a big gap costs a lot.
      closeness = Math.pow(1 - (jobValue - userValue), 2);
    }

    weighted     += closeness * jobValue;            // job's value = its importance
    totalWeight  += jobValue;
  }

  if (totalWeight === 0) return 0.5;
  return +(weighted / totalWeight).toFixed(3);
}

/**
 * Infer an archetype key from job listing text when the business
 * didn't pick one. Cheap keyword heuristic — explicit choice always wins.
 */
const ARCHETYPE_KEYWORDS = {
  bar_service:        ["bartender", "waiter", "waitress", "barista", "camarero", "server", "bar staff"],
  kitchen:            ["chef", "cook", "kitchen", "cocinero"],
  retail:             ["shop", "retail", "cashier", "sales assistant", "dependiente", "tienda"],
  tourism_activities: ["tour", "guide", "excursion", "diving", "rental", "boat", "activities", "guía"],
  reception_admin:    ["reception", "admin", "office", "front desk", "recepción"],
  delivery_driving:   ["driver", "delivery", "courier", "repartidor"],
  cleaning_housekeeping: ["clean", "housekeeping", "limpieza"],
  construction_manual:   ["construction", "builder", "labourer", "electrician", "plumber", "albañil", "obra"],
  creative_media:     ["design", "photo", "video", "social media", "content", "diseño"],
  care_wellness:      ["care", "nurse", "massage", "physio", "wellness", "spa"],
};

export function inferArchetype(jobListing) {
  if (!jobListing) return null;
  if (jobListing.archetype && JOB_ARCHETYPES[jobListing.archetype]) {
    return jobListing.archetype;                     // business chose explicitly
  }

  const text = [
    jobListing.job_title,
    jobListing.description ?? jobListing.job_description,
  ].join(" ").toLowerCase();

  for (const [key, words] of Object.entries(ARCHETYPE_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) return key;
  }
  return null;
}
