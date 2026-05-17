import { useEffect } from 'react';
import { palette, type } from './designSystem';
import { getPrefs, savePrefs } from './prefs';

const STYLE_ID = 'zommy-theme-css';

const setVar = (name, value) => document.documentElement.style.setProperty(name, value);

const updateViewportInsets = () => {
  const viewport = window.visualViewport;
  const keyboardInset = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  setVar('--z-keyboard-inset', `${Math.round(keyboardInset)}px`);
  setVar('--z-viewport-height', `${Math.round(viewport?.height || window.innerHeight)}px`);
};

const themeCss = `
  :root {
    --z-bg: #F5F2EE;
    --z-page: #F5F2EE;
    --z-panel: #FFFFFF;
    --z-text: #1C1917;
    --z-muted: #6B6560;
    --z-hint: #A09890;
    --z-border: rgba(28,25,23,0.10);
    --z-accent: #C96A3A;
    --z-overlay: rgba(15,10,5,0.42);
    --z-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
    --z-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
    --z-serif: "Lora", Georgia, serif;
    --z-radius-card: 18px;
    --z-radius-button: 9999px;
    --z-keyboard-inset: 0px;
    --z-viewport-height: 100dvh;
  }

  html,
  body,
  #root {
    background: var(--z-bg) !important;
    color: var(--z-text) !important;
    font-family: var(--z-sans);
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
    font-family: var(--z-sans);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--z-hint);
  }

  @media (min-width: 720px) {
    body { background: var(--z-bg); }
    .zommy-app-frame { box-shadow: var(--z-shadow); }
  }
`;

const ensureThemeStyle = () => {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== themeCss) style.textContent = themeCss;
};

const applyTheme = (prefs = getPrefs()) => {
  const nextPrefs = { ...prefs, theme: 'dream' };
  document.documentElement.dataset.zommyTheme = nextPrefs.theme;
  document.documentElement.dataset.zommyMode = 'light';
  document.documentElement.style.colorScheme = 'light';
  document.body.dataset.zommyTheme = nextPrefs.theme;
  document.body.dataset.zommyMode = 'light';

  setVar('--z-bg', palette.bg);
  setVar('--z-page', palette.bg);
  setVar('--z-panel', palette.surface);
  setVar('--z-text', palette.ink);
  setVar('--z-muted', palette.inkSub);
  setVar('--z-hint', palette.inkHint);
  setVar('--z-border', palette.border);
  setVar('--z-accent', palette.accent);
  setVar('--z-overlay', palette.overlay);
  setVar('--z-shadow', palette.shadow);
  setVar('--z-sans', type.sans);
  setVar('--z-serif', type.serif);
  setVar('--z-radius-card', '18px');
  setVar('--z-radius-button', '9999px');

  document.body.style.background = palette.bg;
  document.body.style.color = palette.ink;
  document.querySelector("meta[name='theme-color']")?.setAttribute('content', palette.bg);

  if (prefs.theme !== nextPrefs.theme) savePrefs(nextPrefs);
};

export default function ThemeLayer() {
  useEffect(() => {
    ensureThemeStyle();
    applyTheme();
    updateViewportInsets();

    const onPrefsChanged = (event) => applyTheme(event.detail || getPrefs());
    const onStorage = (event) => {
      if (event.key === 'zommy_prefs') applyTheme();
    };
    const onVisibility = () => applyTheme();

    window.addEventListener('zommy:prefs-changed', onPrefsChanged);
    window.addEventListener('storage', onStorage);
    window.addEventListener('resize', updateViewportInsets);
    window.visualViewport?.addEventListener('resize', updateViewportInsets);
    window.visualViewport?.addEventListener('scroll', updateViewportInsets);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('zommy:prefs-changed', onPrefsChanged);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('resize', updateViewportInsets);
      window.visualViewport?.removeEventListener('resize', updateViewportInsets);
      window.visualViewport?.removeEventListener('scroll', updateViewportInsets);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
