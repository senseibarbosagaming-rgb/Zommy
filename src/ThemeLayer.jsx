import { useEffect } from "react";

const DEFAULT_PREFS = { lang: "en", theme: "dark" };

const loadPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("zommy_prefs") || "{}") }; }
  catch { return DEFAULT_PREFS; }
};

const applyTheme = (prefs = loadPrefs()) => {
  const theme = prefs.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.zommyTheme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme === "light" ? "#f8f6f3" : "#101418");
};

export default function ThemeLayer() {
  useEffect(() => {
    applyTheme();

    const onPrefsChanged = (event) => applyTheme(event.detail || loadPrefs());
    const onStorage = (event) => {
      if (event.key === "zommy_prefs") applyTheme();
    };

    window.addEventListener("zommy:prefs-changed", onPrefsChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("zommy:prefs-changed", onPrefsChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <style>{`
      html[data-zommy-theme="light"],
      html[data-zommy-theme="light"] body {
        background: #f8f6f3 !important;
        color: #111827 !important;
      }

      html[data-zommy-theme="light"] main[style*="background: #101418"],
      html[data-zommy-theme="light"] div[style*="background: #101418"],
      html[data-zommy-theme="light"] section[style*="background: #101418"] {
        background: #f8f6f3 !important;
        color: #111827 !important;
      }

      html[data-zommy-theme="light"] [style*="background: rgba(255,255,255,0.045)"],
      html[data-zommy-theme="light"] [style*="background: rgba(255,255,255,0.04)"],
      html[data-zommy-theme="light"] [style*="background: rgba(255,255,255,0.035)"],
      html[data-zommy-theme="light"] [style*="background: rgba(255,255,255,0.05)"],
      html[data-zommy-theme="light"] [style*="background: rgba(255,255,255,0.06)"] {
        background: rgba(17,24,39,0.045) !important;
      }

      html[data-zommy-theme="light"] [style*="border: 1px solid rgba(255,255,255,0.12)"],
      html[data-zommy-theme="light"] [style*="border: 1px solid rgba(255,255,255,0.13)"],
      html[data-zommy-theme="light"] [style*="border: 1px solid rgba(255,255,255,0.14)"],
      html[data-zommy-theme="light"] [style*="border: 1px solid rgba(255,255,255,0.16)"] {
        border-color: rgba(17,24,39,0.13) !important;
      }

      html[data-zommy-theme="light"] [style*="color: #fff"],
      html[data-zommy-theme="light"] [style*="color: \"#fff\""] {
        color: #111827 !important;
      }

      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.72)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.68)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.66)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.64)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.62)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.6)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.58)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.56)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.54)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.52)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.48)"],
      html[data-zommy-theme="light"] [style*="color: rgba(255,255,255,0.42)"] {
        color: rgba(17,24,39,0.62) !important;
      }

      html[data-zommy-theme="light"] input,
      html[data-zommy-theme="light"] textarea,
      html[data-zommy-theme="light"] select {
        background: rgba(17,24,39,0.045) !important;
        color: #111827 !important;
        border-color: rgba(17,24,39,0.14) !important;
      }

      html[data-zommy-theme="light"] select option {
        background: #f8f6f3;
        color: #111827;
      }
    `}</style>
  );
}
