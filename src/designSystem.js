export const palette = {
  parchment: "#FFF8EF",
  paper: "#FFFDF8",
  paperSoft: "#FFF3E4",
  ink: "#35271F",
  inkMuted: "#80695B",
  inkFaint: "rgba(53,39,31,0.52)",
  clay: "#C9795D",
  sage: "#7FA995",
  honey: "#E3B85C",
  lavender: "#A992C7",
  border: "rgba(122,77,57,0.14)",
  borderStrong: "rgba(122,77,57,0.22)",
  shadow: "0 24px 70px rgba(122,77,57,0.14)",
  shadowSoft: "0 16px 44px rgba(122,77,57,0.10)",
};

export const type = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Lora, Georgia, "Times New Roman", serif',
};

export const appSurface = {
  position: "fixed",
  inset: 0,
  zIndex: 900,
  background: `
    radial-gradient(circle at 18% -6%, rgba(227,184,92,0.20), transparent 31%),
    radial-gradient(circle at 100% 2%, rgba(127,169,149,0.16), transparent 34%),
    linear-gradient(180deg, ${palette.parchment} 0%, #FFF1E1 100%)
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
  borderRadius: 28,
  background: "rgba(255,253,248,0.76)",
  boxShadow: palette.shadowSoft,
  backdropFilter: "blur(18px)",
};

export const label = {
  color: palette.clay,
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
};
