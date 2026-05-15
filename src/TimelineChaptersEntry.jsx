import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const COPY = {
  en: {
    chapters: "Chapters",
    body: (count) => count > 0 ? `${count} story ${count === 1 ? "chapter" : "chapters"}` : "Story chapters live here",
  },
  pt: {
    chapters: "Capítulos",
    body: (count) => count > 0 ? `${count} ${count === 1 ? "capítulo" : "capítulos"}` : "Os capítulos vivem aqui",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export default function TimelineChaptersEntry() {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  const refreshCount = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return;
    const { count: nextCount } = await supabase
      .from("capsules")
      .select("id", { count: "exact", head: true });
    setCount(nextCount || 0);
  };

  useEffect(() => {
    const show = () => {
      setVisible(true);
      refreshCount();
    };
    const hide = () => setVisible(false);

    window.addEventListener("zommy:show-timeline", show);
    window.addEventListener("zommy:hide-timeline", hide);
    window.addEventListener("zommy:show-today", hide);
    window.addEventListener("zommy:show-compare", hide);
    window.addEventListener("zommy:show-settings", hide);
    window.addEventListener("zommy:show-chapter", hide);
    window.addEventListener("zommy:show-chapters", hide);

    return () => {
      window.removeEventListener("zommy:show-timeline", show);
      window.removeEventListener("zommy:hide-timeline", hide);
      window.removeEventListener("zommy:show-today", hide);
      window.removeEventListener("zommy:show-compare", hide);
      window.removeEventListener("zommy:show-settings", hide);
      window.removeEventListener("zommy:show-chapter", hide);
      window.removeEventListener("zommy:show-chapters", hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", left: "50%", top: "88px", transform: "translateX(-50%)", width: "min(448px, calc(100vw - 24px))", zIndex: 940, pointerEvents: "none" }}>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-chapters"))}
        style={{ pointerEvents: "auto", width: "100%", border: "1px solid rgba(167,139,250,0.42)", background: "rgba(16,20,24,0.88)", color: "#fff", borderRadius: 18, padding: "11px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 16px 46px rgba(0,0,0,0.28)", backdropFilter: "blur(16px)", cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif" }}>
        <span style={{ display: "grid", gap: 2, textAlign: "left" }}>
          <span style={{ color: "#A78BFA", fontSize: 13, fontWeight: 950 }}>{copy.chapters}</span>
          <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>{copy.body(count)}</span>
        </span>
        <span style={{ width: 34, height: 34, borderRadius: 13, background: "rgba(167,139,250,0.2)", color: "#C4B5FD", display: "grid", placeItems: "center", fontSize: 18 }}>📖</span>
      </button>
    </div>
  );
}
