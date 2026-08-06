// FrontEnd/utils/profileRequirements.js
// Defines which profile information is REQUIRED before each role can use the
// app, and computes what's still missing. Every field listed here must be
// editable in EditProfileScreen (or completable via the quiz) — never require
// something the user has no way to provide.

export const USER_REQUIREMENTS = [
  { key: "name",         label: "Your full name",          action: "profile" },
  { key: "age",          label: "Your age",                action: "profile" },
  { key: "phone_number", label: "Phone number",            action: "profile" },
  { key: "location",     label: "Where you live",          action: "profile" },
  { key: "work_type",    label: "Preferred work type",     action: "profile" },
  { key: "traits",       label: "Personality quiz",        action: "quiz",
    check: (u) => u?.traits && Object.keys(u.traits).length > 0 },
];

export const BUSINESS_REQUIREMENTS = [
  { key: "business_name", label: "Business name",          action: "profile" },
  { key: "owner_name",    label: "Owner / contact name",   action: "profile" },
  { key: "city",          label: "Town or city",           action: "profile" },
  { key: "street",        label: "Street address",         action: "profile" },
  { key: "description",   label: "About your business",    action: "profile" },
];

/**
 * @returns array of unmet requirement objects (empty = ready to go)
 */
export function missingRequirements(user, role) {
  const list = role === "business" ? BUSINESS_REQUIREMENTS : USER_REQUIREMENTS;
  return list.filter((req) => {
    if (req.check) return !req.check(user);
    const v = user?.[req.key];
    return v === undefined || v === null || String(v).trim() === "";
  });
}
