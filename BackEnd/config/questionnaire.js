// BackEnd/config/questionnaire.js
// Lifestyle & personality questionnaire for trait-based job matching.
//
// Each answer contributes points (0–1 scale) to one or more traits.
// Traits are averaged across all answered questions that touch them,
// producing a user trait vector — see utils/traitMatch.js.
//
// The 8 trait dimensions:
//   energy         physical stamina / activity level
//   social         comfort dealing with people all day
//   teamwork       preference for working with others vs alone
//   routine        preference for structure vs variety (1 = loves routine)
//   responsibility reliability, conscientiousness, trustworthiness
//   creativity     making / designing / improvising
//   outdoors       preference for outdoor / physical environments
//   pressure       staying calm when it's busy or stressful

export const TRAITS = [
  "energy", "social", "teamwork", "routine",
  "responsibility", "creativity", "outdoors", "pressure",
];

export const QUESTIONS = [
  {
    id: "free_time",
    text: "What do you most enjoy in your free time?",
    options: [
      { id: "a", text: "Dancing, gym or sports",
        traits: { energy: 1.0, social: 0.6, outdoors: 0.5 } },
      { id: "b", text: "Hanging out with friends, meeting new people",
        traits: { social: 1.0, teamwork: 0.7, energy: 0.5 } },
      { id: "c", text: "Gaming, series or reading at home",
        traits: { routine: 0.8, social: 0.2, energy: 0.2 } },
      { id: "d", text: "Making things — cooking, art, music, DIY",
        traits: { creativity: 1.0, routine: 0.4 } },
    ],
  },
  {
    id: "sports",
    text: "Which best describes you and sport?",
    options: [
      { id: "a", text: "Team sports (football, basketball…)",
        traits: { teamwork: 1.0, energy: 0.9, social: 0.7 } },
      { id: "b", text: "Individual sports (running, gym, surfing…)",
        traits: { energy: 0.9, responsibility: 0.7, routine: 0.6 } },
      { id: "c", text: "Outdoor activities (hiking, cycling, water sports)",
        traits: { outdoors: 1.0, energy: 0.8 } },
      { id: "d", text: "Not really into sport",
        traits: { energy: 0.2, routine: 0.5 } },
    ],
  },
  {
    id: "friends_role",
    text: "In your group of friends, you're usually the one who…",
    options: [
      { id: "a", text: "Organizes the plans and keeps everyone on time",
        traits: { responsibility: 1.0, teamwork: 0.7, social: 0.6 } },
      { id: "b", text: "Brings the energy and gets everyone laughing",
        traits: { social: 1.0, energy: 0.8, pressure: 0.6 } },
      { id: "c", text: "Goes with the flow and helps where needed",
        traits: { teamwork: 0.9, pressure: 0.5 } },
      { id: "d", text: "Prefers smaller plans with one or two close friends",
        traits: { social: 0.3, routine: 0.7, responsibility: 0.6 } },
    ],
  },
  {
    id: "found_money",
    text: "You find a customer's wallet on the floor at work. What do you do?",
    options: [
      { id: "a", text: "Hand it to my manager immediately",
        traits: { responsibility: 1.0 } },
      { id: "b", text: "Try to find the customer myself first",
        traits: { responsibility: 0.9, social: 0.6 } },
      { id: "c", text: "Leave it where it is — not my problem",
        traits: { responsibility: 0.2 } },
      { id: "d", text: "Keep it if nobody saw",
        traits: { responsibility: 0.0 } },
    ],
  },
  {
    id: "pressure_response",
    text: "It's the busiest hour and everything happens at once. You…",
    options: [
      { id: "a", text: "Love it — I work best when it's intense",
        traits: { pressure: 1.0, energy: 0.9 } },
      { id: "b", text: "Stay calm, make a quick plan, work through it",
        traits: { pressure: 0.9, responsibility: 0.8, routine: 0.5 } },
      { id: "c", text: "Ask a teammate for help splitting the work",
        traits: { teamwork: 0.9, pressure: 0.6 } },
      { id: "d", text: "Get stressed — I prefer a steady pace",
        traits: { pressure: 0.2, routine: 0.9 } },
    ],
  },
  {
    id: "environment",
    text: "Your ideal place to spend a working day is…",
    options: [
      { id: "a", text: "Somewhere busy and social — music, people, movement",
        traits: { social: 1.0, energy: 0.8, pressure: 0.7 } },
      { id: "b", text: "Outdoors — beach, streets, on the move",
        traits: { outdoors: 1.0, energy: 0.7 } },
      { id: "c", text: "Quiet and organized — I like focus and order",
        traits: { routine: 1.0, responsibility: 0.7, social: 0.2 } },
      { id: "d", text: "Different every day — I get bored doing the same thing",
        traits: { routine: 0.0, creativity: 0.7, pressure: 0.6 } },
    ],
  },
  {
    id: "commitments",
    text: "A friend asks you to cover their shift on your day off. You…",
    options: [
      { id: "a", text: "Say yes if I possibly can — people can count on me",
        traits: { responsibility: 1.0, teamwork: 0.9 } },
      { id: "b", text: "Say yes only if I have nothing planned",
        traits: { responsibility: 0.7 } },
      { id: "c", text: "Usually say no — my time off is my time off",
        traits: { responsibility: 0.4, routine: 0.6 } },
      { id: "d", text: "Say yes but might cancel last minute",
        traits: { responsibility: 0.1 } },
    ],
  },
  {
    id: "task_style",
    text: "When given a task, you prefer…",
    options: [
      { id: "a", text: "Clear instructions I can follow step by step",
        traits: { routine: 1.0, responsibility: 0.7 } },
      { id: "b", text: "A goal, and freedom to do it my own way",
        traits: { creativity: 1.0, routine: 0.2, responsibility: 0.6 } },
      { id: "c", text: "Working it out together with a team",
        traits: { teamwork: 1.0, social: 0.7 } },
      { id: "d", text: "Physical, hands-on tasks I can see finished",
        traits: { energy: 0.8, outdoors: 0.6, responsibility: 0.6 } },
    ],
  },
];

// ─── Job archetypes ───────────────────────────────────────────────────────────
// Trait profile each job type "wants". Values = importance/level (0–1).
// Businesses pick one when creating a listing (or it's inferred from job_type
// + keywords). A trait absent from a profile means "doesn't matter".
export const JOB_ARCHETYPES = {
  bar_service: {           // bartender, waiter, barista
    label: "Bar / Restaurant service",
    traits: { social: 0.9, energy: 0.8, pressure: 0.9, teamwork: 0.7, responsibility: 0.7 },
  },
  kitchen: {
    label: "Kitchen / Chef",
    traits: { energy: 0.8, pressure: 0.9, routine: 0.7, teamwork: 0.8, responsibility: 0.8 },
  },
  retail: {
    label: "Shop / Retail",
    traits: { social: 0.8, responsibility: 0.8, routine: 0.6, pressure: 0.5 },
  },
  tourism_activities: {    // tour guide, excursions, rentals, water sports
    label: "Tourism / Activities",
    traits: { outdoors: 0.9, social: 0.9, energy: 0.8, responsibility: 0.7, pressure: 0.6 },
  },
  reception_admin: {
    label: "Reception / Admin",
    traits: { routine: 0.8, responsibility: 0.9, social: 0.7, pressure: 0.5 },
  },
  delivery_driving: {
    label: "Delivery / Driving",
    traits: { responsibility: 0.9, routine: 0.7, energy: 0.5, social: 0.3 },
  },
  cleaning_housekeeping: {
    label: "Cleaning / Housekeeping",
    traits: { routine: 0.9, responsibility: 0.9, energy: 0.6, social: 0.2 },
  },
  construction_manual: {
    label: "Construction / Manual work",
    traits: { energy: 0.9, outdoors: 0.8, teamwork: 0.7, responsibility: 0.7 },
  },
  creative_media: {
    label: "Creative / Design / Media",
    traits: { creativity: 0.9, routine: 0.3, responsibility: 0.6 },
  },
  care_wellness: {
    label: "Care / Wellness",
    traits: { responsibility: 0.9, social: 0.8, pressure: 0.7, teamwork: 0.6 },
  },
};
