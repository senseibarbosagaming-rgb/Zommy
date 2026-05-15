import { useEffect, useMemo, useState } from "react";
import { monthBounds } from "./capsuleCore";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "This month’s chapter",
    body: (count) => count > 0 ? `${count} ${count === 1 ? "memory" : "memories"} can become a story for future-you.` : "Save a few memories this month and turn them into a chapter.",
    cta: "Build chapter",
  },
  pt: {
    title: "Capítulo deste mês",
    body: (count) => count > 0 ? `${count} ${count === 1 ? "memória" : "memórias"} podem tornar-se numa história para o futuro.` : "Guarda algumas memórias este mês e transforma-as num capítulo.",
    cta: "Criar capítulo",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export default function ChapterLauncherLayer() {
  const [visible, setVisible] = useState(true);
  const { user, profiles, entries } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 120 });
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);
  const profile = profiles[0];
  const period = monthBounds();

  useEffect(() => {
    const showToday = () => setVisible(true);
    const hideToday = () => setVisible(false);
    window.addEventListener("zommy:show-today", showToday);
    window.addEventListener("zommy:hide-today", hideToday);
    window.addEventListener("zommy:show-timeline", hideToday);
    window.addEventListener("zommy:show-compare", hideToday);
    window.addEventListener("zommy:show-settings", hideToday);
    return () => {
      window.removeEventListener("zommy:show-today", showToday);
      window.removeEventListener("zommy:hide-today", hideToday);
      window.removeEventListener("zommy:show-timeline", hideToday);
      window.removeEventListener("zommy:show-compare", hideToday);
      window.removeEventListener("zommy:show-settings", hideToday);
    };
  }, []);

  if (!visible || !user || !profile) return null;

  const monthCount = entries.filter((entry) => entry.profile_id === profile.id && entry.date >= period.start && entry.date <= period.end).length;
  const openChapter = () => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: profile.id } }));

  return (
    <div style={{ position: "fixed", left: "50%", bottom: "calc(88px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", width: "min(448px, calc(100vw - 28px))", zIndex: 970, pointerEvents: "none" }}>
      <button onClick={openChapter} style={{ width: "100%", pointerEvents: "auto", border: `1px solid ${(profile.color || "#34D399")}66`, background: "rgba(16,20,24,0.92)", color: "#fff", borderRadius: 20, padding: "13px 14px", boxShadow: "0 18px 60px rgba(0,0,0,0.34)", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", backdropFilter: "blur(18px)", fontFamily: "Inter, system-ui, sans-serif" }}>
        <span>
          <span style={{ display: "block", color: profile.color || "#34D399", fontSize: 12, fontWeight: 950 }}>{copy.title}</span>
          <span style={{ display: "block", color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>{copy.body(monthCount)}</span>
        </span>
        <span style={{ background: profile.color || "#34D399", color: "#101418", borderRadius: 999, padding: "9px 11px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" }}>{copy.cta}</span>
      </button>
    </div>
  );
}
