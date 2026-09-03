// FrontEnd/constants/backdrops.js
//
// The backdrop library. Every job listing gets one — a palette plus a tiled
// icon motif drawn from the profession's own world.
//
// Why a curated library instead of image uploads: text stays legible because
// we control both layers, cards stay comparable in the deck, nothing needs
// moderating, and nothing needs storing — a listing saves one short id.
//
// Businesses choose FREELY from the whole library. `category` only groups the
// picker; a beach bar can take the sunset backdrop even though it's filed
// under hospitality, and a diving school can take a night one if they want.
//
// Each backdrop: bg (deep field), ink (title text), muted (eyebrow text),
// accent (the base strip), icon (Ionicons name tiled at low opacity).

export const BACKDROPS = [
  // ── Food and drink ────────────────────────────────────────────────────────
  { id: "sunset-shift", name: "Sunset shift", category: "Food & drink",
    bg: "#264653", ink: "#FFF5EB", muted: "#E9C46A", accent: "#E76F51", icon: "wine" },
  { id: "kitchen-heat", name: "Kitchen heat", category: "Food & drink",
    bg: "#4A403A", ink: "#FDF6EC", muted: "#F4A900", accent: "#C1666B", icon: "flame" },
  { id: "cafe-morning", name: "Café morning", category: "Food & drink",
    bg: "#6B4F3A", ink: "#FBF3E8", muted: "#D4B896", accent: "#C89F6D", icon: "cafe" },
  { id: "stone-oven", name: "Stone oven", category: "Food & drink",
    bg: "#7A2E2E", ink: "#FFF2E4", muted: "#E9C46A", accent: "#D9713C", icon: "pizza" },
  { id: "fine-dining", name: "Fine dining", category: "Food & drink",
    bg: "#241C16", ink: "#F7F0E4", muted: "#C9A227", accent: "#8C6D1F", icon: "restaurant" },

  // ── Sea and outdoors ──────────────────────────────────────────────────────
  { id: "harbour", name: "Harbour", category: "Sea & outdoors",
    bg: "#1A2332", ink: "#F1FAEE", muted: "#A8DADC", accent: "#2D8B8B", icon: "boat" },
  { id: "deep-blue", name: "Deep blue", category: "Sea & outdoors",
    bg: "#0D3B4F", ink: "#EAF7F4", muted: "#9FE1CB", accent: "#1D9E75", icon: "water" },
  { id: "shoreline", name: "Shoreline", category: "Sea & outdoors",
    bg: "#1B6B8F", ink: "#FFF6EC", muted: "#F4D9A0", accent: "#F4A261", icon: "sunny" },
  { id: "terrace", name: "Terrace", category: "Sea & outdoors",
    bg: "#2D4A2B", ink: "#FAF9F6", muted: "#A4AC86", accent: "#7D8471", icon: "leaf" },
  { id: "trail", name: "Trail", category: "Sea & outdoors",
    bg: "#3A4A2B", ink: "#F6F7EE", muted: "#B7C48D", accent: "#6E8B3D", icon: "walk" },

  // ── Trades and construction ───────────────────────────────────────────────
  { id: "workshop", name: "Workshop", category: "Trades",
    bg: "#3D3A34", ink: "#F7F3E9", muted: "#D9A441", accent: "#8A7A5C", icon: "hammer" },
  { id: "site", name: "Site", category: "Trades",
    bg: "#4A3F2A", ink: "#FDF7E6", muted: "#F4A900", accent: "#B98B23", icon: "construct" },
  { id: "current", name: "Current", category: "Trades",
    bg: "#1E2530", ink: "#F2F6FA", muted: "#F2C14E", accent: "#3F6E9E", icon: "flash" },
  { id: "fresh-coat", name: "Fresh coat", category: "Trades",
    bg: "#34404A", ink: "#F4F8FA", muted: "#A8BCD8", accent: "#7D8FB3", icon: "color-palette" },
  { id: "engine", name: "Engine", category: "Trades",
    bg: "#2B2B33", ink: "#F5F3EE", muted: "#E9C46A", accent: "#9A7B3F", icon: "car-sport" },

  // ── Care and wellness ─────────────────────────────────────────────────────
  { id: "studio", name: "Studio", category: "Care & wellness",
    bg: "#5D2E46", ink: "#FCF1F1", muted: "#D4A5A5", accent: "#B87D6D", icon: "flower" },
  { id: "clinic", name: "Clinic", category: "Care & wellness",
    bg: "#1F4E5F", ink: "#F0FAFC", muted: "#A8DADC", accent: "#3E8C9E", icon: "medkit" },
  { id: "training-floor", name: "Training floor", category: "Care & wellness",
    bg: "#22262B", ink: "#F6F4F2", muted: "#F0999B", accent: "#E24B4A", icon: "barbell" },
  { id: "quiet-hours", name: "Quiet hours", category: "Care & wellness",
    bg: "#3E4C59", ink: "#F5F8FA", muted: "#C3D3DE", accent: "#8AA3B5", icon: "moon" },

  // ── Retail and logistics ──────────────────────────────────────────────────
  { id: "storefront", name: "Storefront", category: "Retail & logistics",
    bg: "#3B3A4A", ink: "#F6F3FA", muted: "#A490C2", accent: "#7A6B9E", icon: "storefront" },
  { id: "market", name: "Market", category: "Retail & logistics",
    bg: "#4A7C59", ink: "#F7F9F2", muted: "#D8E8C4", accent: "#F9A620", icon: "basket" },
  { id: "the-round", name: "The round", category: "Retail & logistics",
    bg: "#2F3B45", ink: "#F3F7F9", muted: "#B3C6D1", accent: "#5E8CA6", icon: "cube" },
  { id: "open-road", name: "Open road", category: "Retail & logistics",
    bg: "#232A33", ink: "#F4F6F8", muted: "#E9C46A", accent: "#4E6B85", icon: "navigate" },

  // ── Office and tech ───────────────────────────────────────────────────────
  { id: "circuit", name: "Circuit", category: "Office & tech",
    bg: "#1E1E1E", ink: "#FFFFFF", muted: "#7FB2FF", accent: "#0066FF", icon: "hardware-chip" },
  { id: "front-desk", name: "Front desk", category: "Office & tech",
    bg: "#2A3140", ink: "#F3F7FC", muted: "#B5D4F4", accent: "#378ADD", icon: "briefcase" },
  { id: "clean-lines", name: "Clean lines", category: "Office & tech",
    bg: "#4A6FA5", ink: "#FAFCFF", muted: "#D4E4F7", accent: "#8FB3DA", icon: "sparkles" },

  // ── Nights and events ─────────────────────────────────────────────────────
  { id: "night-shift", name: "Night shift", category: "Nights & events",
    bg: "#2B1E3E", ink: "#F3F0FA", muted: "#A490C2", accent: "#5D4B87", icon: "moon" },
  { id: "stage", name: "Stage", category: "Nights & events",
    bg: "#2A1F3D", ink: "#FBF0F5", muted: "#ED93B1", accent: "#B8477A", icon: "musical-notes" },
  { id: "front-row", name: "Front row", category: "Nights & events",
    bg: "#1F2440", ink: "#F4F5FC", muted: "#9FA8DA", accent: "#5C6BC0", icon: "megaphone" },
];

export const DEFAULT_BACKDROP = "harbour";

/** Ordered category names, for grouping the picker. */
export const BACKDROP_CATEGORIES = [...new Set(BACKDROPS.map(b => b.category))];

/** Look up a backdrop by id, always returning something usable. */
export function getBackdrop(id) {
  return BACKDROPS.find(b => b.id === id)
      ?? BACKDROPS.find(b => b.id === DEFAULT_BACKDROP);
}

/**
 * Sensible starting point when a business hasn't chosen yet — derived from the
 * job's archetype so an unchosen listing still looks deliberate. They remain
 * free to pick anything.
 */
const ARCHETYPE_DEFAULTS = {
  bar_service:          "sunset-shift",
  kitchen:              "kitchen-heat",
  reception_admin:      "front-desk",
  tourism_activities:   "shoreline",
  cleaning_housekeeping:"clean-lines",
  construction_manual:  "workshop",
  retail:               "storefront",
  delivery_driving:     "open-road",
};

export function suggestBackdrop(archetype) {
  return ARCHETYPE_DEFAULTS[archetype] ?? DEFAULT_BACKDROP;
}
