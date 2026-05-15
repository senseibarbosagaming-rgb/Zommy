import { useEffect, useMemo, useState } from "react";

const COPY = {
  en: {
    title: "Saved for future you.",
    body: "One small moment is now part of their story.",
    chapter: "It can go into this month’s chapter.",
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
    <div role="status" style={{ position: "fixed", left: "50%", top: "calc(18px + env(safe-area-inset-top, 0px))", transform: "translateX(-50%)", width: "min(420px, calc(100vw - 28px))", zIndex: 2600, border: "1px solid rgba(52,211,153,0.45)", background: "rgba(16,20,24,0.94)", color: "#fff", borderRadius: 22, padding: "14px 15px", boxShadow: "0 22px 80px rgba(0,0,0,0.42)", display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, alignItems: "center", backdropFilter: "blur(18px)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(52,211,153,0.18)", color: "#34D399", display: "grid", placeItems: "center", fontSize: 24 }}>✓</div>
      <div>
        <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, lineHeight: 1.1, fontWeight: 650 }}>{copy.title}</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{copy.body} {copy.chapter}</div>
      </div>
    </div>
  );
}
