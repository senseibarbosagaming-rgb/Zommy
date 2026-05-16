// designSystem.js — Milk & Stone tokens with legacy aliases for compatibility
export const palette = {
  // New tokens
  milk: "#FAFAF8",       // page background
  surface: "#FFFFFF",    // cards and surfaces
  stone: "#1A1714",      // primary text
  muted: "#8C8480",      // secondary text
  accent: "#C17B5C",     // warm terracotta accent
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
  shadowSoft: "0 8px 24px rgba(0,0,0,0.04)",

  // Legacy aliases (kept for compatibility with existing code)
  ivory: "#FAFAF8",
  parchment: "#FAFAF8",
  paper: "#FFFFFF",
  paperSoft: "#F7EFE6",
  paperWarm: "#FFF4EA",
  ink: "#1A1714",
  inkMuted: "#8C8480",
  inkFaint: "rgba(26,23,20,0.54)",
  clay: "#C17B5C", // maps to accent
  peach: "#EBCBBB",
  sage: "#8DA399",
  honey: "#F4DFA7",
  deep: "#3A4A43",
  lavender: "#A99FB7",
  softBlue: "#91AFC7",
  roseBeige: "#D9A99D",
  border: "rgba(26,23,20,0.06)",
  borderStrong: "rgba(26,23,20,0.12)",
};

export const memoryTones = [
  { name: "Clay", color: palette.accent, bg: "#FFF4F0" },
  { name: "Sage", color: palette.sage, bg: "#F1F6F3" },
  { name: "Lavender", color: palette.lavender, bg: "#F3F1F6" },
];

export const type = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '"DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  padding: `calc(18px + env(safe-area-inset-top, 0px)) 20px calc(${bottom}px + var(--z-keyboard-inset, 0px))`,
  display: "grid",
  gap: 24,
});

export const card = {
  borderRadius: 20,
  background: palette.surface,
  boxShadow: palette.shadow,
};

export const label = {
  color: palette.muted,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
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
  color: "#FFFFFF",
  borderRadius: 999,
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: palette.shadowSoft,
  minHeight: 48,
});

export const secondaryButton = (tone = palette.accent) => ({
  border: `1px solid ${tone}22`,
  background: "transparent",
  color: tone,
  borderRadius: 999,
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: 500,
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
  border: `1px solid rgba(0,0,0,0.04)`,
  background: palette.surface,
  color: palette.stone,
  borderRadius: 12,
  padding: "12px 13px",
  font: "inherit",
  fontSize: 15,
};
