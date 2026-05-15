import { useEffect } from "react";

const DEFAULT_PREFS = { lang: "en", theme: "dream" };

const THEMES = {
  dream: {
    mode: "light",
    bg: "#FFF4E8",
    page: "#FFFDF7",
    panel: "#FFFFFF",
    soft: "#F8E9DC",
    text: "#3A2A22",
    muted: "#80695B",
    faint: "#A69082",
    border: "rgba(122, 77, 57, 0.18)",
    accent: "#D9826B",
    accent2: "#8FB9A8",
    accent3: "#F2C879",
    nav: "#F2DDCC",
    overlay: "rgba(255, 253, 247, 0.93)",
  },
  night: {
    mode: "dark",
    bg: "#18120F",
    page: "#18120F",
    panel: "#241A16",
    soft: "rgba(255,244,232,0.07)",
    text: "#FFF7EF",
    muted: "rgba(255,247,239,0.68)",
    faint: "rgba(255,247,239,0.46)",
    border: "rgba(255,244,232,0.14)",
    accent: "#E59A83",
    accent2: "#9FC8B8",
    accent3: "#F2C879",
    nav: "#3A2A22",
    overlay: "rgba(24,18,15,0.91)",
  },
};

const normalizeTheme = (value) => {
  if (value === "light") return "dream";
  if (value === "dark") return "night";
  return THEMES[value] ? value : DEFAULT_PREFS.theme;
};

const loadPrefs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    return { ...DEFAULT_PREFS, ...raw, theme: normalizeTheme(raw.theme) };
  } catch {
    return DEFAULT_PREFS;
  }
};

const setVar = (name, value) => document.documentElement.style.setProperty(name, value);

const applyTheme = (prefs = loadPrefs()) => {
  const themeName = normalizeTheme(prefs.theme);
  const theme = THEMES[themeName];

  document.documentElement.dataset.zommyTheme = themeName;
  document.documentElement.dataset.zommyMode = theme.mode;
  document.documentElement.style.colorScheme = theme.mode;
  document.body.dataset.zommyTheme = themeName;
  document.body.dataset.zommyMode = theme.mode;

  setVar("--z-bg", theme.bg);
  setVar("--z-page", theme.page);
  setVar("--z-panel", theme.panel);
  setVar("--z-soft", theme.soft);
  setVar("--z-text", theme.text);
  setVar("--z-muted", theme.muted);
  setVar("--z-faint", theme.faint);
  setVar("--z-border", theme.border);
  setVar("--z-accent", theme.accent);
  setVar("--z-accent-2", theme.accent2);
  setVar("--z-accent-3", theme.accent3);
  setVar("--z-nav", theme.nav);
  setVar("--z-overlay", theme.overlay);
  setVar("--z-radius-card", "26px");
  setVar("--z-radius-button", "18px");

  document.body.style.background = theme.bg;
  document.body.style.color = theme.text;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme.bg);

  try {
    const current = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    if (current.theme !== themeName) localStorage.setItem("zommy_prefs", JSON.stringify({ ...current, theme: themeName }));
  } catch {}
};

export default function ThemeLayer() {
  useEffect(() => {
    applyTheme();

    const onPrefsChanged = (event) => applyTheme(event.detail || loadPrefs());
    const onStorage = (event) => {
      if (event.key === "zommy_prefs") applyTheme();
    };
    const onVisibility = () => applyTheme();

    window.addEventListener("zommy:prefs-changed", onPrefsChanged);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("zommy:prefs-changed", onPrefsChanged);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <style>{`
      html, body, #root {
        background: var(--z-bg) !important;
        color: var(--z-text) !important;
      }

      body {
        transition: background-color 180ms ease, color 180ms ease;
      }

      .zommy-brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        background: linear-gradient(145deg, #FFFDF7, #FFE2D1);
        border: 1px solid rgba(122,77,57,0.14);
        display: inline-grid;
        place-items: center;
        box-shadow: 0 12px 30px rgba(122,77,57,0.16);
      }

      .zommy-brand-mark::before {
        content: "♡";
        color: var(--z-accent);
        font-size: 24px;
        line-height: 1;
        transform: translateY(-1px);
      }

      html[data-zommy-mode="light"] main,
      html[data-zommy-mode="light"] [style*="background: #101418"],
      html[data-zommy-mode="light"] [style*="background:#101418"],
      html[data-zommy-mode="light"] [style*="background: rgb(16, 20, 24)"],
      html[data-zommy-mode="light"] [style*="background-color: rgb(16, 20, 24)"],
      html[data-zommy-mode="light"] [style*="background: #0d0d0d"],
      html[data-zommy-mode="light"] [style*="background: rgb(13, 13, 13)"] {
        background: radial-gradient(circle at top left, #FFF1E5 0, var(--z-page) 42%, #FFF8EE 100%) !important;
        color: var(--z-text) !important;
      }

      html[data-zommy-mode="light"] [style*="background: #111820"],
      html[data-zommy-mode="light"] [style*="background:#111820"],
      html[data-zommy-mode="light"] [style*="background: rgb(17, 24, 32)"],
      html[data-zommy-mode="light"] [style*="background: #151d25"],
      html[data-zommy-mode="light"] [style*="background:#151d25"],
      html[data-zommy-mode="light"] [style*="background: rgb(21, 29, 37)"] {
        background: var(--z-panel) !important;
        color: var(--z-text) !important;
      }

      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.045)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.045)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.04)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.04)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.035)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.035)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.05)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.05)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.06)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.06)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255,255,255,0.08)"],
      html[data-zommy-mode="light"] [style*="background: rgba(255, 255, 255, 0.08)"] {
        background: var(--z-soft) !important;
      }

      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.09)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.09)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.1)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.1)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.12)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.12)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.13)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.13)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.14)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.14)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255,255,255,0.16)"],
      html[data-zommy-mode="light"] [style*="border: 1px solid rgba(255, 255, 255, 0.16)"] {
        border-color: var(--z-border) !important;
      }

      html[data-zommy-mode="light"] [style*="color: #fff"],
      html[data-zommy-mode="light"] [style*="color:#fff"],
      html[data-zommy-mode="light"] [style*="color: rgb(255, 255, 255)"] {
        color: var(--z-text) !important;
      }

      html[data-zommy-mode="light"] [style*="color: rgba(255,255,255"],
      html[data-zommy-mode="light"] [style*="color: rgba(255, 255, 255"] {
        color: var(--z-muted) !important;
      }

      html[data-zommy-mode="light"] input,
      html[data-zommy-mode="light"] textarea,
      html[data-zommy-mode="light"] select {
        background: var(--z-panel) !important;
        color: var(--z-text) !important;
        border-color: var(--z-border) !important;
      }

      html[data-zommy-mode="light"] input::placeholder,
      html[data-zommy-mode="light"] textarea::placeholder {
        color: var(--z-faint) !important;
      }

      html[data-zommy-mode="light"] select option {
        background: var(--z-panel);
        color: var(--z-text);
      }

      html[data-zommy-mode="light"] nav[style] {
        background: var(--z-nav) !important;
      }

      html[data-zommy-mode="light"] button[style*="background: transparent"],
      html[data-zommy-mode="light"] button[style*="background: rgba(255,255,255"],
      html[data-zommy-mode="light"] button[style*="background: rgba(255, 255, 255"] {
        color: var(--z-text) !important;
      }
    `}</style>
  );
}