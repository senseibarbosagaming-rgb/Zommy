import { useEffect, useMemo, useState } from "react";

const COPY = {
  en: {
    title: "Family sharing",
    body: "Invite another parent to share a child’s memories, timeline, and chapters.",
    cta: "Open",
  },
  pt: {
    title: "Partilha familiar",
    body: "Convida outro pai/mãe para partilhar memórias, timeline e capítulos.",
    cta: "Abrir",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export default function FamilySharingEntryLayer() {
  const [visible, setVisible] = useState(false);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    window.addEventListener("zommy:show-settings", show);
    window.addEventListener("zommy:hide-settings", hide);
    window.addEventListener("zommy:show-family-sharing", hide);
    window.addEventListener("zommy:show-today", hide);
    window.addEventListener("zommy:show-timeline", hide);
    window.addEventListener("zommy:show-compare", hide);
    return () => {
      window.removeEventListener("zommy:show-settings", show);
      window.removeEventListener("zommy:hide-settings", hide);
      window.removeEventListener("zommy:show-family-sharing", hide);
      window.removeEventListener("zommy:show-today", hide);
      window.removeEventListener("zommy:show-timeline", hide);
      window.removeEventListener("zommy:show-compare", hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", left: "50%", bottom: "calc(88px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", width: "min(448px, calc(100vw - 28px))", zIndex: 1120, pointerEvents: "none" }}>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-family-sharing"))}
        style={{ width: "100%", pointerEvents: "auto", border: "1px solid rgba(167,139,250,0.42)", background: "rgba(16,20,24,0.94)", color: "#fff", borderRadius: 20, padding: "13px 14px", boxShadow: "0 18px 60px rgba(0,0,0,0.34)", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", backdropFilter: "blur(18px)", fontFamily: "Inter, system-ui, sans-serif" }}>
        <span>
          <span style={{ display: "block", color: "#C4B5FD", fontSize: 13, fontWeight: 950 }}>{copy.title}</span>
          <span style={{ display: "block", color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>{copy.body}</span>
        </span>
        <span style={{ background: "#A78BFA", color: "#101418", borderRadius: 999, padding: "9px 11px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" }}>{copy.cta}</span>
      </button>
    </div>
  );
}
