// prefs.js — single source of truth for user preferences
// Replace all per-file getPrefs() / savePrefs() / getCopy() with imports from here.

const KEY = "zommy_prefs";
const DEFAULT_PREFS = { lang: "en", theme: "dream" };

const normalizeTheme = (theme) =>
  theme === "dark" ? "night" : theme === "light" ? "dream" : theme || DEFAULT_PREFS.theme;

export const getPrefs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULT_PREFS, ...raw, theme: normalizeTheme(raw.theme) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const savePrefs = (prefs) => {
  const next = { ...prefs, theme: normalizeTheme(prefs.theme) };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const getLang = () => getPrefs().lang === "pt" ? "pt" : "en";

export const dispatchPrefsChanged = (prefs) =>
  window.dispatchEvent(new CustomEvent("zommy:prefs-changed", { detail: prefs }));
