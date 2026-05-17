export const palette = {
  bg: '#F5F2EE',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF8F5',
  overlay: 'rgba(15,10,5,0.42)',
  overlayBlur: 'rgba(245,242,238,0.88)',
  ink: '#1C1917',
  inkSub: '#6B6560',
  inkHint: '#A09890',
  accent: '#C96A3A',
  accentLight: '#F2E0D4',
  accentMid: '#E8B99A',
  accentText: '#7A3718',
  success: '#4A8C6A',
  successBg: '#EBF5EF',
  successText: '#1D4D35',
  warning: '#9A6B1A',
  warningBg: '#FDF3DC',
  warningText: '#6B4509',
  danger: '#B84040',
  dangerBg: '#FBEAEA',
  dangerText: '#6E1F1F',
  border: 'rgba(28,25,23,0.10)',
  borderStrong: 'rgba(28,25,23,0.18)',
  shadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 24px rgba(0,0,0,0.09)',
};

export const type = {
  sans: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  serif: '"Lora", Georgia, "Times New Roman", serif',
  weight: { body: 400, ui: 500, heading: 600 },
};

export const radii = {
  sm: '8px', md: '12px', lg: '18px', xl: '24px', full: '9999px',
};

export const appSurface = {
  position: 'fixed', inset: 0, zIndex: 900,
  background: palette.bg, color: palette.ink,
  overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  fontFamily: type.sans,
};

export const contentFrame = (bottomPad = 112) => ({
  maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
  padding: 'calc(20px + env(safe-area-inset-top,0px)) 20px',
  paddingBottom: `calc(${bottomPad}px + var(--z-keyboard-inset,0px))`,
  display: 'grid', gap: 20, alignContent: 'start',
});

export const card = {
  background: palette.surface,
  borderRadius: radii.lg,
  border: `1px solid ${palette.border}`,
  boxShadow: palette.shadow,
};

export const softCard = (overrides = {}) => ({ ...card, padding: '18px 20px', ...overrides });

export const field = {
  width: '100%', border: `1px solid ${palette.border}`,
  background: palette.surfaceAlt, color: palette.ink,
  borderRadius: radii.md, padding: '11px 14px',
  font: 'inherit', fontSize: 15, minHeight: 46,
  outline: 'none', transition: 'border-color 0.15s',
};

export const primaryButton = (tone = palette.accent) => ({
  border: 'none', background: tone, color: '#fff',
  borderRadius: radii.full, padding: '11px 20px',
  fontSize: 14, fontWeight: type.weight.ui,
  cursor: 'pointer', minHeight: 46,
});

export const secondaryButton = (tone = palette.accent) => ({
  border: `1.5px solid ${tone}`, background: 'transparent', color: tone,
  borderRadius: radii.full, padding: '10px 18px',
  fontSize: 14, fontWeight: type.weight.ui,
  cursor: 'pointer', minHeight: 46,
});

export const label = {
  fontSize: 11, fontWeight: type.weight.ui, color: palette.inkSub,
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

export const emptyStateCard = {
  ...card, padding: '32px 24px', textAlign: 'center',
  display: 'grid', gap: 14,
};

export const memoryTones = [
  { name: 'Terracotta', color: palette.accent, bg: palette.accentLight },
  { name: 'Sage', color: '#4A8C6A', bg: '#EBF5EF' },
  { name: 'Lavender', color: '#7B6EA8', bg: '#EEEAF8' },
];

export const profileTones = [
  ...memoryTones,
  { name: 'Blue', color: '#3A7FBA', bg: '#E5F0FA' },
  { name: 'Rose', color: '#B85878', bg: '#F8E6EC' },
  { name: 'Amber', color: '#A07020', bg: '#FDF3DC' },
];
