// BackEnd/config/listingQuestions.js
// The per-listing "role profile" questionnaire answered by BUSINESSES when
// posting a job. Unlike the user quiz (which MEASURES a person over many
// indirect questions), this DECLARES what a role needs in a few direct
// trade-offs. Formal register — the audience is employers.
//
// Each option contributes trait TARGETS (the level the role wants) and marks
// those traits as "cared about" for importance weighting. Answers merge OVER
// the archetype defaults per-trait; unanswered traits keep the archetype value.

export const LISTING_QUESTIONS = [
  {
    id: "people_contact",
    text: "Day to day, this role primarily involves…",
    options: [
      { id: "a", text: "Continuous contact with customers or guests",
        traits: { social: 0.9, energy: 0.7 } },
      { id: "b", text: "A balance of interaction and independent work",
        traits: { social: 0.6, teamwork: 0.7 } },
      { id: "c", text: "Focused, independent work with little interaction",
        traits: { social: 0.2, routine: 0.7 } },
    ],
  },
  {
    id: "structure",
    text: "When something unexpected arises, you would prefer the person to…",
    options: [
      { id: "a", text: "Follow the established process and escalate",
        traits: { routine: 0.8, responsibility: 0.9 } },
      { id: "b", text: "Adapt and resolve it on their own initiative",
        traits: { creativity: 0.8, pressure: 0.8, routine: 0.3 } },
    ],
  },
  {
    id: "pace",
    text: "The pace of this role is best described as…",
    options: [
      { id: "a", text: "Calm and steady, rarely under pressure",
        traits: { pressure: 0.3, routine: 0.7 } },
      { id: "b", text: "Busy in waves, with intermittent rushes",
        traits: { pressure: 0.7, energy: 0.7 } },
      { id: "c", text: "Consistently high-pressure and demanding",
        traits: { pressure: 0.95, energy: 0.8 } },
    ],
  },
  {
    id: "team_solo",
    text: "Most of the work is carried out…",
    options: [
      { id: "a", text: "As a close team, coordinating constantly",
        traits: { teamwork: 0.9, social: 0.7 } },
      { id: "b", text: "Independently, each person owning their area",
        traits: { teamwork: 0.3, responsibility: 0.9 } },
    ],
  },
  {
    id: "physical",
    text: "In terms of physical demands, this role is…",
    options: [
      { id: "a", text: "Physical and frequently outdoors",
        traits: { outdoors: 0.9, energy: 0.8 } },
      { id: "b", text: "Active and on your feet, but indoors",
        traits: { energy: 0.7 } },
      { id: "c", text: "Largely seated or stationary",
        traits: { outdoors: 0.2, energy: 0.3 } },
    ],
  },
  {
    id: "priority",
    text: "If only one quality could be guaranteed in this hire, it would be…",
    // This question most strongly sets IMPORTANCE — the trait(s) it names are
    // weighted up because the business has declared them the single priority.
    options: [
      { id: "a", text: "Reliability — consistent, thorough, dependable",
        traits: { responsibility: 0.95 }, emphasis: ["responsibility"] },
      { id: "b", text: "Energy and attitude — drive and presence",
        traits: { energy: 0.85, social: 0.8 }, emphasis: ["energy", "social"] },
      { id: "c", text: "Creativity — fresh thinking and ideas",
        traits: { creativity: 0.95 }, emphasis: ["creativity"] },
      { id: "d", text: "Composure — unshakeable under pressure",
        traits: { pressure: 0.95 }, emphasis: ["pressure"] },
    ],
  },
];

// How much more a trait counts when the business explicitly answered about it,
// and again when they named it their top priority (Q6 "emphasis").
// Tunable from one place once real feedback arrives (per the plan, we watch
// how this performs before trusting it heavily).
export const ANSWERED_WEIGHT  = 1.4;   // trait touched by any answer
export const EMPHASIS_WEIGHT   = 2.0;  // trait named in the priority question

/**
 * Fold a business's listing answers into a trait target + importance map.
 * @param {Array<{questionId, optionId}>} answers
 * @returns {{ target: object, importance: object }} or null if no answers
 */
export function buildRoleProfile(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return null;

  const target     = {};
  const importance = {};

  for (const { questionId, optionId } of answers) {
    const q = LISTING_QUESTIONS.find((x) => x.id === questionId);
    const o = q?.options.find((x) => x.id === optionId);
    if (!o) continue;

    for (const [trait, value] of Object.entries(o.traits)) {
      target[trait] = value;                                   // later answers win ties
      importance[trait] = Math.max(importance[trait] ?? 1, ANSWERED_WEIGHT);
    }
    for (const trait of o.emphasis ?? []) {
      importance[trait] = EMPHASIS_WEIGHT;
    }
  }

  return { target, importance };
}
