// FrontEnd/theme.js — shared design tokens used across all screens

export const COLORS = {
  primary:       '#2563EB',
  primaryLight:  '#EFF6FF',
  primaryDark:   '#1D4ED8',
  background:    '#F8FAFC',
  card:          '#FFFFFF',
  textPrimary:   '#1E293B',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  border:        '#E2E8F0',
  success:       '#22C55E',
  successLight:  '#DCFCE7',
  danger:        '#EF4444',
  dangerLight:   '#FEE2E2',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  info:          '#0EA5E9',
  infoLight:     '#E0F2FE',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor:   '#000',
    shadowOpacity: 0.06,
    shadowOffset:  { width: 0, height: 1 },
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOpacity: 0.10,
    shadowOffset:  { width: 0, height: 3 },
    shadowRadius:  8,
    elevation:     4,
  },
};
