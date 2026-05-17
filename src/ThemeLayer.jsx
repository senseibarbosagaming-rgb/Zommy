import { useEffect } from "react";
import { palette, type } from "./designSystem";

const DEFAULT_PREFS = { lang: "en", theme: "dream" };
const STYLE_ID = "zommy-theme-css";

const normalizeTheme = () => DEFAULT_PREFS.theme;

const loadPrefs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    return { ...DEFAULT_PREFS, ...raw, theme: normalizeTheme(raw.theme) };
  } catch {
    return DEFAULT_PREFS;
  }
};

const setVar = (name, value) => document.documentElement.style.setProperty(name, value);

const updateViewportInsets = () => {
  const viewport = window.visualViewport;
  const keyboardInset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  setVar("--z-keyboard-inset", `${Math.round(keyboardInset)}px`);
  setVar("--z-viewport-height", `${Math.round(viewport?.height || window.innerHeight)}px`);
};

const themeCss = `
  :root {
    --z-bg: ${palette.milk};
    --z-page: ${palette.milk};
    --z-panel: ${palette.surface};
    --z-soft: ${palette.wash};
    --z-text: ${palette.stone};
    --z-muted: ${palette.muted};
    --z-faint: ${palette.faint};
    --z-border: ${palette.line};
    --z-accent: ${palette.accent};
    --z-overlay: ${palette.overlay};
    --z-shadow: ${palette.shadow};
    --z-radius-card: 20px;
    --z-radius-button: 999px;
    --z-keyboard-inset: 0px;
    --z-viewport-height: 100dvh;
  }

  html,
  body,
  #root {
    background: var(--z-bg) !important;
    color: var(--z-text) !important;
    font-family: ${type.sans};
  }

  body {
    color-scheme: light;
    transition: background-color 180ms ease, color 180ms ease;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    background: var(--z-bg);
  }

  button,
  input,
  textarea,
  select {
    font-family: ${type.sans};
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--z-faint);
  }

  @media (min-width: 720px) {
    body {
      background: var(--z-bg);
    }

    .zommy-app-frame {
      box-shadow: ${palette.sideShadow};
    }
  }
`;

const ensureThemeStyle = () => {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== themeCss) style.textContent = themeCss;
};

const applyTheme = (prefs = loadPrefs()) => {
  const themeName = normalizeTheme(prefs.theme);

  document.documentElement.dataset.zommyTheme = themeName;
  document.documentElement.dataset.zommyMode = "light";
  document.documentElement.style.colorScheme = "light";
  document.body.dataset.zommyTheme = themeName;
  document.body.dataset.zommyMode = "light";

  setVar("--z-bg", palette.milk);
  setVar("--z-page", palette.milk);
  setVar("--z-panel", palette.surface);
  setVar("--z-soft", palette.wash);
  setVar("--z-text", palette.stone);
  setVar("--z-muted", palette.muted);
  setVar("--z-faint", palette.faint);
  setVar("--z-border", palette.line);
  setVar("--z-accent", palette.accent);
  setVar("--z-overlay", palette.overlay);
  setVar("--z-shadow", palette.shadow);
  setVar("--z-radius-card", "20px");
  setVar("--z-radius-button", "999px");

  document.body.style.background = palette.milk;
  document.body.style.color = palette.stone;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", palette.milk);

  try {
    const current = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    if (current.theme !== themeName) localStorage.setItem("zommy_prefs", JSON.stringify({ ...current, theme: themeName }));
  } catch {}
};

export default function ThemeLayer() {
  useEffect(() => {
    ensureThemeStyle();
    applyTheme();
    updateViewportInsets();

    const onPrefsChanged = (event) => applyTheme(event.detail || loadPrefs());
    const onStorage = (event) => {
      if (event.key === "zommy_prefs") applyTheme();
    };
    const onVisibility = () => applyTheme();

    window.addEventListener("zommy:prefs-changed", onPrefsChanged);
    window.addEventListener("storage", onStorage);
    window.addEventListener("resize", updateViewportInsets);
    window.visualViewport?.addEventListener("resize", updateViewportInsets);
    window.visualViewport?.addEventListener("scroll", updateViewportInsets);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("zommy:prefs-changed", onPrefsChanged);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("resize", updateViewportInsets);
      window.visualViewport?.removeEventListener("resize", updateViewportInsets);
      window.visualViewport?.removeEventListener("scroll", updateViewportInsets);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
