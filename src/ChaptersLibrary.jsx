import { useEffect, useMemo, useState } from "react";
import { appSurface, contentFrame, emptyStateCard, palette, type } from "./designSystem";
import { supabase } from "./supabase";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Chapters",
    subtitle: "The story version of your timeline.",
    draft: "Draft chapter",
    locked: "Locked chapter",
    empty: "Monthly chapters will appear here as you save memories.",
    loading: "Loading...",
    open: "Open chapter",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"}`,
  },
  pt: {
    title: "Capítulos",
    subtitle: "A versão em história da tua timeline.",
    draft: "Capítulo em rascunho",
    locked: "Capítulo fechado",
    empty: "Os capítulos mensais vão aparecer aqui à medida que guardas memórias.",
    loading: "A carregar...",
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
    <main style={{ ...appSurface, zIndex: 920 }}>
      <div style={contentFrame(120)}>
        <header>
          <h1 style={titleStyle}>{copy.title}</h1>
          <p style={subtitleStyle}>{copy.subtitle}</p>
        </header>

        {loading && <div style={{ color: palette.muted }}>{copy.loading}</div>}

        {!loading && chapters.length === 0 && (
          <section style={emptyStateCard}>
            {copy.empty}
          </section>
        )}

        <section style={{ display: "grid", gap: 24 }}>
          {chapters.map((chapter) => {
            const profile = profiles.find((item) => item.id === chapter.profile_id);
            const chapterEntries = entries.filter((entry) => entry.profile_id === chapter.profile_id && entry.date >= chapter.period_start && entry.date <= chapter.period_end);
            const cover = chapterEntries.find((entry) => entry.photoUrl);
            const tone = profile?.color || palette.accent;

            return (
              <article key={chapter.id} style={chapterCardStyle}>
                {cover?.photoUrl ? (
                  <img src={cover.photoUrl} alt={chapter.title} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ height: 180, display: "grid", placeItems: "center", fontSize: 42, background: profile?.bg || palette.accentSoft, color: tone }}>{profile?.emoji || "○"}</div>
                )}

                <div style={{ padding: 20, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ color: chapter.status === "locked" ? palette.warning : tone, fontSize: 11, fontWeight: type.weight.ui, letterSpacing: 0, textTransform: "uppercase" }}>
                      {chapter.status === "locked" ? copy.locked : copy.draft}
                    </div>
                    <div style={{ color: palette.muted, fontSize: 12 }}>{copy.memories(chapterEntries.length)}</div>
                  </div>

                  <h2 style={chapterTitleStyle}>{chapter.title}</h2>

                  <p style={chapterBodyStyle}>
                    {chapter.letter}
                  </p>

                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: chapter.profile_id } }))}
                    style={{ justifySelf: "start", border: "none", background: palette.accent, color: palette.surface, borderRadius: 999, minHeight: 48, padding: "11px 16px", fontSize: 13, fontWeight: type.weight.heading, cursor: "pointer" }}>
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

const titleStyle = { fontFamily: type.serif, fontSize: 38, lineHeight: 1.05, fontWeight: type.weight.heading, letterSpacing: 0 };
const subtitleStyle = { color: palette.muted, marginTop: 8, fontSize: 14, lineHeight: 1.5 };
const chapterCardStyle = { border: "none", borderRadius: 20, overflow: "hidden", background: palette.surface, boxShadow: palette.shadow };
const chapterTitleStyle = { fontFamily: type.serif, fontSize: 28, lineHeight: 1.08, fontWeight: type.weight.heading, letterSpacing: 0 };
const chapterBodyStyle = { color: palette.faint, lineHeight: 1.65, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" };
