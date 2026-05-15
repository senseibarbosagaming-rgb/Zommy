import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Chapters",
    subtitle: "The story version of your timeline.",
    draft: "Draft chapter",
    locked: "Locked chapter",
    empty: "Monthly chapters will appear here as you save memories.",
    open: "Open chapter",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"}`,
  },
  pt: {
    title: "Capítulos",
    subtitle: "A versão em história da tua timeline.",
    draft: "Capítulo em rascunho",
    locked: "Capítulo fechado",
    empty: "Os capítulos mensais vão aparecer aqui à medida que guardas memórias.",
    open: "Abrir capítulo",
    memories: (count) => `${count} ${count === 1 ? "memória" : "memórias"}`,
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export default function ChaptersLibrary() {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, profiles, entries } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 400 });
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);

  useEffect(() => {
    const show = async () => {
      setOpen(true);
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("capsules")
        .select("*")
        .order("period_start", { ascending: false });
      setChapters(data || []);
      setLoading(false);
    };

    const hide = () => setOpen(false);

    window.addEventListener("zommy:show-chapters", show);
    window.addEventListener("zommy:hide-chapters", hide);

    return () => {
      window.removeEventListener("zommy:show-chapters", show);
      window.removeEventListener("zommy:hide-chapters", hide);
    };
  }, [user]);

  if (!open || !user) return null;

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 920, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "22px 16px 120px", display: "grid", gap: 16 }}>
        <header>
          <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 38, lineHeight: 1.05, fontWeight: 650 }}>{copy.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.62)", marginTop: 6, fontSize: 14 }}>{copy.subtitle}</p>
        </header>

        {loading && <div style={{ color: "rgba(255,255,255,0.46)" }}>Loading…</div>}

        {!loading && chapters.length === 0 && (
          <section style={{ border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 24, padding: 26, textAlign: "center", color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>
            {copy.empty}
          </section>
        )}

        <section style={{ display: "grid", gap: 14 }}>
          {chapters.map((chapter) => {
            const profile = profiles.find((item) => item.id === chapter.profile_id);
            const chapterEntries = entries.filter((entry) => entry.profile_id === chapter.profile_id && entry.date >= chapter.period_start && entry.date <= chapter.period_end);
            const cover = chapterEntries.find((entry) => entry.photoUrl);

            return (
              <article key={chapter.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.04)", boxShadow: "0 18px 50px rgba(0,0,0,0.22)" }}>
                {cover?.photoUrl ? (
                  <img src={cover.photoUrl} alt={chapter.title} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ height: 180, display: "grid", placeItems: "center", fontSize: 42, background: "rgba(255,255,255,0.03)" }}>{profile?.emoji || "📖"}</div>
                )}

                <div style={{ padding: 18, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ color: chapter.status === "locked" ? "#FBBF24" : (profile?.color || "#34D399"), fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                      {chapter.status === "locked" ? copy.locked : copy.draft}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 12 }}>{copy.memories(chapterEntries.length)}</div>
                  </div>

                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 28, lineHeight: 1.08, fontWeight: 650 }}>{chapter.title}</h2>

                  <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.65, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {chapter.letter}
                  </p>

                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: chapter.profile_id } }))}
                    style={{ justifySelf: "start", border: "none", background: profile?.color || "#34D399", color: "#101418", borderRadius: 999, padding: "11px 14px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
                    {copy.open}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
