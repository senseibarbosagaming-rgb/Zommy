import { useEffect, useMemo, useState } from "react";
import { palette, type } from "./designSystem";

const COPY = {
  en: {
    title: "Saved for future you.",
    body: "One small moment is now part of their story.",
    chapter: "It can go into this month's chapter.",
  },
  pt: {
    title: "Guardado para o teu eu futuro.",
    body: "Um pequeno momento já faz parte da história.",
    chapter: "Pode entrar no capítulo deste mês.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export default function MemorySavedToast() {
  const [visible, setVisible] = useState(false);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  useEffect(() => {
    let timeout;
    const show = () => {
      window.clearTimeout(timeout);
      setVisible(true);
      timeout = window.setTimeout(() => setVisible(false), 3600);
    };
    window.addEventListener("zommy:memory-saved", show);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("zommy:memory-saved", show);
    };
  }, []);

  if (!visible) return null;

  return (
    <div role="status" style={toastStyle}>
      <div style={iconStyle}>✓</div>
      <div>
        <div style={titleStyle}>{copy.title}</div>
        <div style={bodyStyle}>{copy.body} {copy.chapter}</div>
      </div>
    </div>
  );
}

const toastStyle = { position: "fixed", left: "50%", top: "calc(18px + env(safe-area-inset-top, 0px))", transform: "translateX(-50%)", width: "min(420px, calc(100vw - 40px))", zIndex: 2600, border: "none", background: palette.surface, color: palette.stone, borderRadius: 20, padding: "14px 15px", boxShadow: palette.sideShadow, display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, alignItems: "center", fontFamily: type.sans };
const iconStyle = { width: 44, height: 44, borderRadius: 16, background: palette.successSoft, color: palette.success, display: "grid", placeItems: "center", fontSize: 24 };
const titleStyle = { fontFamily: type.serif, fontSize: 20, lineHeight: 1.1, fontWeight: type.weight.heading };
const bodyStyle = { color: palette.muted, fontSize: 13, lineHeight: 1.45, marginTop: 4 };
