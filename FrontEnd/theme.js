// FrontEnd/theme.js — Atlantic Light design tokens.
//
// The identity: deep Atlantic teal doing the everyday work, coral reserved
// for the moments that matter (apply, match, message), everything resting on
// sun-bleached sand surfaces. Warm where template apps are cold.

export const COLORS = {
  // Ocean — the working color
  primary:       '#0B6E72',   // deep Atlantic teal
  primaryLight:  '#E3F1F0',   // sea glass
  primaryDark:   '#084F53',

  // Coral — the emotional color. Use sparingly: apply, match, celebrate.
  accent:        '#F2695C',
  accentLight:   '#FDEAE6',

  // Sun — one job only: the match-score flash
  sun:           '#F4B942',
  sunLight:      '#FCF2DC',

  // Surfaces — sun-bleached, never clinical
  background:    '#FAF6F0',   // sand-white
  card:          '#FFFFFF',

  // Ink with sea depth
  textPrimary:   '#17282A',
  textSecondary: '#4E6467',
  textMuted:     '#93A6A6',

  border:        '#EAE2D6',   // warm sand hairline

  // States — kept in the same warm family
  success:       '#1E9E6A',
  successLight:  '#E1F4EA',
  danger:        '#E2503F',
  dangerLight:   '#FBE7E3',
  warning:       '#E9A23B',
  warningLight:  '#FBF0DB',
  info:          '#2C8FA3',   // lagoon
  infoLight:     '#E2F1F5',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
};

export const RADIUS = {
  sm:   10,
  md:   14,
  lg:   20,
  xl:   28,
  full: 999,
};

// Warm-tinted shadows — grey shadows on sand look dirty
export const SHADOWS = {
  sm: {
    shadowColor:   '#6B5B45',
    shadowOpacity: 0.08,
    shadowOffset:  { width: 0, height: 2 },
    shadowRadius:  6,
    elevation:     2,
  },
  md: {
    shadowColor:   '#6B5B45',
    shadowOpacity: 0.12,
    shadowOffset:  { width: 0, height: 4 },
    shadowRadius:  12,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#6B5B45',
    shadowOpacity: 0.16,
    shadowOffset:  { width: 0, height: 8 },
    shadowRadius:  20,
    elevation:     8,
  },
};

// Type presets — personality through weight and tracking, no font deps.
// display: big, heavy, tight. eyebrow: tiny, wide-tracked caps.
export const TYPE = {
  display: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: COLORS.textPrimary },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: COLORS.primary },
};
