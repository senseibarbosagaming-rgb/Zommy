export const palette = {
  // Brand tokens — Milk & Stone
  milk: "#FAFAF8",       // page background
  surface: "#FFFFFF",    // cards and surfaces
  stone: "#1A1714",      // primary text (warmer than black)
  muted: "#8C8480",      // secondary text
  accent: "#C17B5C",     // warm terracotta accent (used sparingly)

  // Shadows
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
  shadowSoft: "0 8px 24px rgba(0,0,0,0.04)",
};

export const memoryTones = [
  // Keep a small set of gentle tone accents for memory cards; these should not be used as full-surface fills
  { name: "Clay", color: palette.accent, bg: "#FFF4F0" },
  { name: "Sage", color: "#8DA399", bg: "#F1F6F3" },
  { name: "Lavender", color: "#A99FB7", bg: "#F3F1F6" },
];

export const type = {
  // Editorial serif for headings and confident display
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  // Legible geometric UI type for body and controls
  sans: '"DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// App surface — neutral warm page background, no decorative gradients
export const appSurface = {
  position: "fixed",
  inset: 0,
  zIndex: 900,
  background: palette.milk,
  color: palette.stone,
  overflowY: "auto",
  fontFamily: type.sans,
};

// Content column. Horizontal padding is a consistent 20px everywhere per design rules.
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
  // keep content readable — no backdropFilter or borders on surfaces
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
