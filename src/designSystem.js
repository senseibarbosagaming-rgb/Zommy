// designSystem.js - Milk & Stone tokens with legacy aliases for compatibility.
export const palette = {
  milk: "#FAFAF8",
  surface: "#FFFFFF",
  stone: "#1A1714",
  muted: "#8C8480",
  accent: "#C17B5C",

  line: "rgba(26,23,20,0.08)",
  lineStrong: "rgba(26,23,20,0.14)",
  faint: "rgba(26,23,20,0.52)",
  wash: "rgba(26,23,20,0.035)",
  washStrong: "rgba(26,23,20,0.06)",
  overlay: "rgba(26,23,20,0.38)",
  overlaySoft: "rgba(250,250,248,0.92)",
  accentSoft: "rgba(193,123,92,0.12)",
  accentWash: "rgba(193,123,92,0.08)",
  accentLine: "rgba(193,123,92,0.26)",
  success: "#6F8E80",
  successSoft: "rgba(111,142,128,0.14)",
  warning: "#A77A32",
  warningSoft: "rgba(167,122,50,0.14)",
  danger: "#B45148",
  dangerSoft: "rgba(180,81,72,0.12)",
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
  shadowSoft: "0 8px 24px rgba(0,0,0,0.04)",
  sideShadow: "0 18px 60px rgba(26,23,20,0.08)",

  // Legacy aliases retained while older components are migrated.
  ivory: "#FAFAF8",
  parchment: "#FAFAF8",
  paper: "#FFFFFF",
  paperSoft: "rgba(26,23,20,0.035)",
  paperWarm: "rgba(193,123,92,0.08)",
  ink: "#1A1714",
  inkMuted: "#8C8480",
  inkFaint: "rgba(26,23,20,0.52)",
  clay: "#C17B5C",
  peach: "#EBCBBB",
  sage: "#8DA399",
  honey: "#F4DFA7",
  deep: "#3A4A43",
  lavender: "#A99FB7",
  softBlue: "#91AFC7",
  roseBeige: "#D9A99D",
  border: "rgba(26,23,20,0.08)",
  borderStrong: "rgba(26,23,20,0.14)",
};

export const profileTones = [
  { name: "Terracotta", color: palette.accent, bg: palette.accentWash },
  { name: "Sage", color: palette.sage, bg: "rgba(141,163,153,0.14)" },
  { name: "Stone", color: palette.deep, bg: "rgba(58,74,67,0.10)" },
  { name: "Rose", color: palette.roseBeige, bg: "rgba(217,169,157,0.16)" },
  { name: "Blue", color: palette.softBlue, bg: "rgba(145,175,199,0.14)" },
  { name: "Lavender", color: palette.lavender, bg: "rgba(169,159,183,0.14)" },
];

export const memoryTones = [
  { name: "Terracotta", color: palette.accent, bg: palette.accentWash },
  { name: "Sage", color: palette.sage, bg: "rgba(141,163,153,0.14)" },
  { name: "Lavender", color: palette.lavender, bg: "rgba(169,159,183,0.14)" },
];

export const type = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '"DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  weight: {
    body: 400,
    ui: 500,
    heading: 700,
  },
};

export const appSurface = {
  position: "fixed",
  inset: 0,
  zIndex: 900,
  background: palette.milk,
  color: palette.stone,
  overflowY: "auto",
  fontFamily: type.sans,
};

export const contentFrame = (bottom = 112) => ({
  maxWidth: 480,
  margin: "0 auto",
  minHeight: "100dvh",
  padding: `calc(20px + env(safe-area-inset-top, 0px)) 20px calc(${bottom}px + var(--z-keyboard-inset, 0px))`,
  display: "grid",
  gap: 24,
});

export const card = {
  borderRadius: 20,
  background: palette.surface,
  border: "none",
  boxShadow: palette.shadow,
};

export const label = {
  color: palette.muted,
  fontSize: 12,
  fontWeight: type.weight.ui,
  letterSpacing: 0,
  textTransform: "uppercase",
};

export const softCard = (overrides = {}) => ({
  ...card,
  padding: 20,
  ...overrides,
});

export const primaryButton = (tone = palette.accent) => ({
  border: "none",
  background: tone,
  color: palette.surface,
  borderRadius: 999,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: type.weight.heading,
  cursor: "pointer",
  boxShadow: palette.shadow,
  minHeight: 48,
});

export const secondaryButton = (tone = palette.accent) => ({
  border: `1px solid ${palette.line}`,
  background: palette.surface,
  color: tone,
  borderRadius: 999,
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: type.weight.ui,
  cursor: "pointer",
  minHeight: 48,
});

export const emptyStateCard = {
  ...card,
  padding: 24,
  textAlign: "center",
  display: "grid",
  gap: 12,
};

export const field = {
  width: "100%",
  border: `1px solid ${palette.line}`,
  background: palette.surface,
  color: palette.stone,
  borderRadius: 14,
  padding: "12px 13px",
  font: "inherit",
  fontSize: 15,
  minHeight: 48,
};
