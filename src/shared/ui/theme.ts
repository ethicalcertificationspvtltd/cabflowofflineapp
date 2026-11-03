export const colors = {
  ink: '#0B1F1A',
  inkMuted: '#3D5A52',
  paper: '#F3F7F5',
  paperElevated: '#FFFFFF',
  field: '#E4EEE9',
  accent: '#0F6E56',
  accentSoft: '#D7F0E6',
  warning: '#9A6700',
  warningSoft: '#FFF3CD',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  sync: '#175CD3',
  syncSoft: '#D1E9FF',
  offline: '#B54708',
  border: '#C9D8D1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  brand: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.inkMuted,
  },
  body: {
    fontSize: 15,
    color: colors.ink,
  },
  caption: {
    fontSize: 12,
    color: colors.inkMuted,
  },
};
