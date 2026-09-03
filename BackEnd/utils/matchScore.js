// BackEnd/utils/matchScore.js
// Content-based matching: scores how well a business/job fits a user (0–100).
//
// Signals used (all optional — missing data degrades gracefully):
//   • work_type            ↔ job_listing.job_type          (max 30)
//   • industry_preference  ↔ business.industry + job text   (max 30)
//   • location             ↔ business.city                  (max 25)
//   • listing freshness    (exponential decay over 30 days)  (max 15)
//
// Pure functions, no DB access → easy to unit-test.

import { traitCompatibility, inferArchetype, resolveListingTarget } from "./traitMatch.js";
import { buildRoleProfile } from "../config/listingQuestions.js";

// ─── Weights (tweak freely, must sum to 100) ─────────────────────────────────
const WEIGHTS = {
  traits:    35,   // lifestyle/personality fit (questionnaire) — the headline signal
  jobType:   12,
  industry:  13,
  location:  20,
  freshness:  8,
  learned:   12,   // what the user actually swipes on (revealed preference)
};

// Industry keyword dictionary. Maps a canonical industry to words commonly
// found in job titles/descriptions, so we can infer industry even when the
// business hasn't set one explicitly.
const INDUSTRY_KEYWORDS = {
  hospitality: ["waiter", "waitress", "bartender", "bar", "restaurant", "chef",
                "cook", "kitchen", "hotel", "reception", "barista", "cafe",
                "camarero", "cocinero", "hostel"],
  retail:      ["shop", "store", "cashier", "sales assistant", "retail",
                "supermarket", "tienda", "dependiente"],
  tech:        ["developer", "software", "it ", "programmer", "web", "engineer",
                "sysadmin", "data", "informático"],
  tourism:     ["tour", "guide", "excursion", "diving", "rental", "boat",
                "activities", "guía", "turismo"],
  construction:["builder", "construction", "electrician", "plumber", "painter",
                "labourer", "albañil", "obra"],
  cleaning:    ["cleaner", "cleaning", "housekeeping", "limpieza"],
  delivery:    ["driver", "delivery", "courier", "repartidor", "transporte"],
  beauty:      ["hairdresser", "barber", "nails", "salon", "spa", "peluquería"],
  healthcare:  ["nurse", "care", "physio", "clinic", "carer", "enfermero"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const norm = (s) => (s ?? "").toString().trim().toLowerCase();

/** Split "hospitality, retail,tech" → ["hospitality","retail","tech"] */
function parseIndustries(csv) {
  return norm(csv)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ─── Component scores (each returns 0..1) ────────────────────────────────────

/** work_type ↔ job_type. 'any' (or unset) is a soft match. */
function jobTypeScore(user, job) {
  const want = norm(user?.work_type);
  const offer = norm(job?.job_type);

  if (!want || want === "any") return 0.5;   // no preference → neutral
  if (!offer)                  return 0.4;   // job didn't specify → mild penalty
  if (want === offer)          return 1.0;   // exact match

  // part-time and casual are close cousins
  const flexible = new Set(["part-time", "casual"]);
  if (flexible.has(want) && flexible.has(offer)) return 0.7;

  return 0.0;
}

/** User's preferred industries vs business industry field + job text keywords. */
function industryScore(user, business, job) {
  const prefs = parseIndustries(user?.industry_preference);
  if (prefs.length === 0) return 0.5;        // no preference → neutral

  // 1) Direct match on an explicit business.industry field (if present)
  const bizIndustry = norm(business?.industry);
  if (bizIndustry && prefs.includes(bizIndustry)) return 1.0;

  // 2) Keyword inference from job title + descriptions
  const haystack = [
    norm(job?.job_title),
    norm(job?.description ?? job?.job_description),
    norm(business?.description),
    norm(business?.business_name),
  ].join(" ");

  let best = 0;
  for (const pref of prefs) {
    // the preference word itself appearing counts as a strong signal
    if (haystack.includes(pref)) { best = Math.max(best, 0.9); continue; }

    const keywords = INDUSTRY_KEYWORDS[pref] ?? [];
    const hits = keywords.filter((kw) => haystack.includes(kw)).length;
    if (hits >= 2)      best = Math.max(best, 0.9);
    else if (hits === 1) best = Math.max(best, 0.7);
  }
  return best;
}

// Lanzarote town coordinates — covers every settlement that realistically
// appears in a location field. Small island, hardcoding beats a geocoding API.
export const LANZAROTE_TOWNS = {
  "arrecife":            [28.963, -13.548],
  "puerto del carmen":   [28.921, -13.663],
  "costa teguise":       [29.005, -13.505],
  "playa blanca":        [28.865, -13.833],
  "playa honda":         [28.955, -13.583],
  "tias":                [28.961, -13.645],
  "tías":                [28.961, -13.645],
  "yaiza":               [28.952, -13.765],
  "san bartolome":       [29.000, -13.621],
  "san bartolomé":       [29.000, -13.621],
  "teguise":             [29.060, -13.564],
  "haria":               [29.144, -13.502],
  "haría":               [29.144, -13.502],
  "tinajo":              [29.063, -13.678],
  "puerto calero":       [28.916, -13.702],
  "caleta de famara":    [29.115, -13.554],
  "famara":              [29.115, -13.554],
  "orzola":              [29.221, -13.454],
  "órzola":              [29.221, -13.454],
  "la santa":            [29.110, -13.660],
  "arrieta":             [29.131, -13.457],
  "macher":              [28.938, -13.687],
  "mácher":              [28.938, -13.687],
  "uga":                 [28.938, -13.744],
  "guime":               [28.972, -13.601],
  "güime":               [28.972, -13.601],
  "mala":                [29.098, -13.470],
  "tahiche":             [29.011, -13.556],
  "conil":               [28.949, -13.665],
};

/** Find town coords inside a free-text location string. */
export function findTown(text) {
  if (!text) return null;
  // longest names first so "puerto del carmen" wins over "carmen"-less matches
  for (const town of Object.keys(LANZAROTE_TOWNS).sort((a, b) => b.length - a.length)) {
    if (text.includes(town)) return LANZAROTE_TOWNS[town];
  }
  return null;
}

/** Great-circle distance in km. */
export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** travel_distance enum → km limit. */
export const TRAVEL_LIMITS = { "5km": 5, "10km": 10, "25km": 25, "any": Infinity };

/**
 * Distance-aware location score. Falls back to string matching when a town
 * isn't recognized. Within the user's travel limit scores decay gently with
 * distance; beyond it, sharply — but never to a hard zero on-island.
 */
function locationScore(user, business, jobListing, liveCoords) {
  const userLoc = norm(user?.location);
  const bizCity = norm(business?.city);

  // Best available target: the job's precise coordinates, else the town
  const jobLoc  = jobListing?.location;
  const target  = (jobLoc?.lat != null && jobLoc?.lng != null)
    ? [jobLoc.lat, jobLoc.lng]
    : findTown(bizCity);

  // Best available origin: the device's live position, else the profile town
  const origin = liveCoords ?? findTown(userLoc);

  if (origin && target) {
    const km    = haversineKm(origin, target);
    const limit = TRAVEL_LIMITS[norm(user?.travel_distance)] ?? 15;

    let score;
    if (km <= limit) {
      score = limit === Infinity ? Math.max(0.7, 1 - km / 60) : 1 - 0.3 * (km / limit);
    } else {
      score = Math.max(0.05, 0.6 - 0.04 * (km - limit));
    }
    return { score, km: Math.round(km * 10) / 10 };
  }

  // String fallbacks (no coordinates known on one side)
  if (!userLoc || !bizCity)                          return { score: 0.4, km: null };
  if (userLoc === bizCity)                           return { score: 1.0, km: null };
  if (userLoc.includes(bizCity) || bizCity.includes(userLoc)) return { score: 0.95, km: null };
  if (norm(user?.travel_distance) === "any")         return { score: 0.6, km: null };
  return { score: 0.0, km: null };
}

/** Newer listings score higher — exponential decay, half-life ≈ 30 days. */
function freshnessScore(job, business) {
  const created = job?.createdAt ?? business?.createdAt;
  if (!created) return 0.3;

  const ageDays = (Date.now() - new Date(created).getTime()) / 86_400_000;
  if (ageDays < 0) return 1.0;
  return Math.pow(0.5, ageDays / 30);        // 1.0 today → 0.5 at 30d → 0.25 at 60d
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Score a single business (with its newest active job listing) for a user.
 * @returns {{ total: number, breakdown: Object }} total is 0–100 (rounded)
 */

/**
 * Score from what the user actually swipes on, not what they said in the quiz.
 * Returns 0.5 (neutral) until there's evidence. Confidence ramps with the
 * number of signals so a handful of swipes can't dominate the ranking.
 */
function learnedScore(user, jobListing) {
  const learned = user?.learned;
  const signals = learned?.signals ?? 0;
  if (!learned || signals < 3) return 0.5;

  // Mongoose Map fields arrive as JS Maps unless the caller ran toJSON();
  // support both so scoring works no matter which path we're called from.
  const asObj = (v) =>
    !v ? {} : v instanceof Map ? Object.fromEntries(v)
    : typeof v.toObject === "function" ? v.toObject() : v;
  const types = asObj(learned.job_types);
  const archs = asObj(learned.archetypes);
  const parts = [];

  const t = types[jobListing?.job_type];
  if (typeof t === "number") parts.push(t);
  const a = archs[jobListing?.archetype ?? inferArchetype(jobListing)];
  if (typeof a === "number") parts.push(a);

  if (parts.length === 0) return 0.5;
  const raw = parts.reduce((s, v) => s + v, 0) / parts.length;

  // Confidence: 0 at 3 signals, full at ~25
  const confidence = Math.min(1, (signals - 3) / 22);
  return 0.5 + (raw - 0.5) * confidence;
}


/**
 * Turn a score breakdown into up to three short phrases the user recognises
 * as being about them. Only genuinely strong components qualify — a reason
 * that appears on every card tells the user nothing.
 */
export function matchReasons(parts, breakdown) {
  const out = [];
  if (parts.traits    >= 0.75) out.push({ icon: "sparkles",         text: "Fits your personality" });
  if (parts.location  >= 0.8)  out.push({ icon: "location",         text: breakdown.distance_km != null && breakdown.distance_km < 1 ? "Right nearby" : "Close to you" });
  if (parts.jobType   >= 0.9)  out.push({ icon: "time",             text: "Your kind of hours" });
  if (parts.industry  >= 0.85) out.push({ icon: "briefcase",        text: "Your industry" });
  if (parts.learned   >= 0.7)  out.push({ icon: "trending-up",      text: "Like jobs you've liked" });
  if (parts.freshness >= 0.9)  out.push({ icon: "flash",            text: "Just posted" });
  return out.slice(0, 3);
}

export function scoreBusinessForUser(user, business, jobListing, liveCoords) {
  const parts = {
    traits:    (() => {
                 const rp = jobListing?.role_answers?.length
                   ? buildRoleProfile(jobListing.role_answers)
                   : null;
                 const { traits: tgt, importance } = resolveListingTarget(jobListing, rp);
                 return traitCompatibility(user?.traits, tgt, importance);
               })(),
    jobType:   jobTypeScore(user, jobListing),
    industry:  industryScore(user, business, jobListing),
    freshness: freshnessScore(jobListing, business),
    learned:   learnedScore(user, jobListing),
  };
  const loc = locationScore(user, business, jobListing, liveCoords);
  parts.location = loc.score;

  let total = 0;
  const breakdown = {};
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const pts = parts[key] * weight;
    breakdown[key] = Math.round(pts);
    total += pts;
  }
  breakdown.distance_km = loc.km;   // null when no coordinates are known

  return { total: Math.round(total), breakdown, reasons: matchReasons(parts, breakdown) };
}

/**
 * Rank a list of businesses for a user, best match first.
 * Adds `match_score` (0–100) and `match_breakdown` to each item.
 * A small deterministic jitter (±2) breaks ties so the deck isn't
 * identical for every user with the same profile.
 *
 * @param {Object}   user        Mongoose user doc or plain object
 * @param {Array}    businesses  plain objects, each may carry `job_listing`
 * @returns {Array} same objects, scored and sorted (desc)
 */
export function rankBusinessesForUser(user, businesses, liveCoords) {
  const jitter = (id) => {
    // cheap deterministic hash → -2..+2
    const s = String(id);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % 5) - 2;
  };

  return businesses
    .map((b) => {
      const { total, breakdown, reasons } = scoreBusinessForUser(user, b, b.job_listing, liveCoords);
      return { ...b, match_score: total, match_breakdown: breakdown, match_reasons: reasons };
    })
    .sort((a, b) =>
      b.match_score !== a.match_score
        ? b.match_score - a.match_score
        : jitter(b.id ?? b._id) - jitter(a.id ?? a._id)   // tiebreak only
    );
}
