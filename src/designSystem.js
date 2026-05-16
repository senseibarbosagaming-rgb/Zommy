export const palette = {
  ivory: "#FBF7F0",
  parchment: "#FBF7F0",
  paper: "#FFFDF8",
  paperSoft: "#F7EFE6",
  paperWarm: "#FFF4EA",
  ink: "#2E2923",
  inkMuted: "#7B7065",
  inkFaint: "rgba(46,41,35,0.54)",
  clay: "#B9785F",
  peach: "#EBCBBB",
  sage: "#8DA399",
  honey: "#F4DFA7",
  deep: "#3A4A43",
  lavender: "#A99FB7",
  softBlue: "#91AFC7",
  roseBeige: "#D9A99D",
  border: "rgba(91,67,48,0.14)",
  borderStrong: "rgba(91,67,48,0.24)",
  shadow: "0 24px 70px rgba(91,67,48,0.16)",
  shadowSoft: "0 14px 38px rgba(91,67,48,0.10)",
  shadowLift: "0 8px 24px rgba(91,67,48,0.08)",
};

export const memoryTones = [
  { name: "Clay", color: palette.clay, bg: "#F1DDD3" },
  { name: "Sage", color: palette.sage, bg: "#E2ECE7" },
  { name: "Honey", color: "#D7A84D", bg: "#FFF1C9" },
  { name: "Lavender grey", color: palette.lavender, bg: "#ECE7F1" },
  { name: "Soft blue", color: palette.softBlue, bg: "#E3EEF5" },
  { name: "Rose beige", color: palette.roseBeige, bg: "#F3DFDA" },
];

export const type = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Lora, Georgia, "Times New Roman", serif',
};

export const appSurface = {
  position: "fixed",
  inset: 0,
  zIndex: 900,
  background: `
    radial-gradient(circle at 18% -6%, rgba(244,223,167,0.42), transparent 31%),
    radial-gradient(circle at 100% 2%, rgba(141,163,153,0.20), transparent 34%),
    linear-gradient(180deg, ${palette.ivory} 0%, #F8EFE4 100%)
  `,
  color: palette.ink,
  overflowY: "auto",
  fontFamily: type.sans,
};

export const contentFrame = (bottom = 112) => ({
  maxWidth: 480,
  margin: "0 auto",
  minHeight: "100dvh",
  padding: `calc(18px + env(safe-area-inset-top, 0px)) 16px calc(${bottom}px + var(--z-keyboard-inset, 0px))`,
  display: "grid",
  gap: 14,
});

export const card = {
  border: `1px solid ${palette.border}`,
  borderRadius: 26,
  background: "rgba(255,253,248,0.86)",
  boxShadow: palette.shadowSoft,
  backdropFilter: "blur(18px)",
};

export const label = {
  color: palette.clay,
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

export const softCard = (overrides = {}) => ({
  ...card,
  padding: 16,
  ...overrides,
});

export const primaryButton = (tone = palette.clay) => ({
  border: "none",
  background: tone,
  color: "#FFFDF8",
  borderRadius: 999,
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: `0 12px 28px ${tone}33`,
});

export const secondaryButton = (tone = palette.clay) => ({
  border: `1px solid ${tone}45`,
  background: `${tone}16`,
  color: tone,
  borderRadius: 999,
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: 850,
  cursor: "pointer",
});

export const emptyStateCard = {
  ...card,
  borderStyle: "dashed",
  padding: 24,
  textAlign: "center",
  display: "grid",
  gap: 10,
};

export const field = {
  width: "100%",
  border: `1px solid ${palette.border}`,
  background: palette.paper,
  color: palette.ink,
  borderRadius: 16,
  padding: "12px 13px",
  font: "inherit",
  fontSize: 15,
};
