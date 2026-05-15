import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useZommyData } from "./useZommyData";

const TAGS = [
  { id: "first-steps", label: "First steps" },
  { id: "first-word", label: "First word" },
  { id: "birthday", label: "Birthday" },
  { id: "illness", label: "Illness" },
  { id: "trip", label: "Trip" },
  { id: "school", label: "School" },
  { id: "family", label: "Family" },
];

const COPY = {
  en: {
    title: "Timeline",
    allChildren: "All children",
    search: "Search memories",
    searchPlaceholder: "grandma, beach, first word…",
    allYears: "All years",
    allTags: "All tags",
    favorites: "Favorites",
    noChildren: "Add a child first to build a timeline.",
    noResults: "No memories match this view yet.",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"}`,
    addMemory: "Add memory",
    close: "Close",
    favorite: "Favorite",
    removeFavorite: "Remove favorite",
    noteEmpty: "No note",
  },
  pt: {
    title: "Timeline",
    allChildren: "Todas as crianças",
    search: "Pesquisar memórias",
    searchPlaceholder: "avó, praia, primeira palavra…",
    allYears: "Todos os anos",
    allTags: "Todas as tags",
    favorites: "Favoritas",
    noChildren: "Adiciona uma criança para criar uma timeline.",
    noResults: "Ainda não há memórias com estes filtros.",
    memories: (count) => `${count} ${count === 1 ? "memória" : "memórias"}`,
    addMemory: "Adicionar memória",
    close: "Fechar",
    favorite: "Favorita",
    removeFavorite: "Remover favorita",
    noteEmpty: "Sem nota",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const formatDate = (date, lang) => new Date(`${date}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthLabel = (date, lang) => new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  month: "long",
  year: "numeric",
});

const diffDays = (from, to) => {
  if (!from || !to) return null;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.floor((end - start) / 86400000);
};

const ageAtMemory = (profile, entryDate, lang) => {
  if (!profile?.birthdate) return "";
  const days = diffDays(profile.birthdate, entryDate);
  if (days == null || days < 0) return "";
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);
  const remainderMonths = months % 12;

  if (lang === "pt") {
    if (years <= 0) return `${months} mes${months === 1 ? "" : "es"}`;
    return `${years} ano${years === 1 ? "" : "s"}${remainderMonths ? ` e ${remainderMonths} mes${remainderMonths === 1 ? "" : "es"}` : ""}`;
  }

  if (years <= 0) return `${months} month${months === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"}${remainderMonths ? `, ${remainderMonths} month${remainderMonths === 1 ? "" : "s"}` : ""}`;
};

const groupByMonth = (entries) => entries.reduce((groups, entry) => {
  const key = entry.date.slice(0, 7);
  return { ...groups, [key]: [...(groups[key] || []), entry] };
}, {});

export default function TimelineScreen() {
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState("all");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [tag, setTag] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 600 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles]);

  useEffect(() => {
    const show = (event) => {
      const requestedProfileId = event.detail?.profileId;
      if (requestedProfileId) setProfileId(requestedProfileId);
      setOpen(true);
      refresh();
    };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-timeline", show);
    window.addEventListener("zommy:hide-timeline", hide);
    return () => {
      window.removeEventListener("zommy:show-timeline", show);
      window.removeEventListener("zommy:hide-timeline", hide);
    };
  }, [refresh]);

  useEffect(() => {
    if (profileId !== "all" && !profiles.some((profile) => profile.id === profileId)) setProfileId("all");
  }, [profileId, profiles]);

  if (!open || !user) return null;

  const years = Array.from(new Set(entries.map((entry) => entry.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    const profile = profileById[entry.profile_id];
    const note = (entry.note || "").toLowerCase();
    const name = (profile?.name || "").toLowerCase();
    if (profileId !== "all" && entry.profile_id !== profileId) return false;
    if (normalizedQuery && !note.includes(normalizedQuery) && !name.includes(normalizedQuery)) return false;
    if (year && entry.date.slice(0, 4) !== year) return false;
    if (tag && !(entry.tags || []).includes(tag)) return false;
    if (favoritesOnly && !entry.favorite) return false;
    return true;
  });

  const grouped = groupByMonth(filtered);
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const openComposer = () => {
    const targetProfile = profileId !== "all" ? profiles.find((profile) => profile.id === profileId) : profiles[0];
    window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: targetProfile?.id || "" } }));
  };

  const toggleFavorite = async (entry) => {
    const nextFavorite = !entry.favorite;
    setSelectedEntry((current) => current?.id === entry.id ? { ...current, favorite: nextFavorite } : current);
    await supabase.from("entries").update({ favorite: nextFavorite }).eq("id", entry.id).eq("user_id", user.id);
    refresh();
  };

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 16px 112px", display: "grid", gap: 14 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.08, fontWeight: 650 }}>{copy.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.58)", marginTop: 4, fontSize: 13 }}>{copy.memories(filtered.length)}</p>
          </div>
          <button onClick={openComposer} style={{ border: "none", background: "#34D399", color: "#101418", borderRadius: 999, padding: "11px 13px", minHeight: 44, fontWeight: 950, cursor: "pointer" }}>+ {copy.addMemory}</button>
        </header>

        {profiles.length === 0 ? (
          <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{copy.noChildren}</section>
        ) : (
          <>
            <section style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              <FilterPill active={profileId === "all"} onClick={() => setProfileId("all")}>{copy.allChildren}</FilterPill>
              {profiles.map((profile) => (
                <FilterPill key={profile.id} active={profileId === profile.id} color={profile.color} onClick={() => setProfileId(profile.id)}>{profile.emoji || "👶"} {profile.name}</FilterPill>
              ))}
            </section>

            <section style={{ display: "grid", gap: 9 }}>
              <label style={{ display: "grid", gap: 6, color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                {copy.search}
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} style={inputStyle()} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={year} onChange={(event) => setYear(event.target.value)} style={selectStyle()}>
                  <option value="">{copy.allYears}</option>
                  {years.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={tag} onChange={(event) => setTag(event.target.value)} style={selectStyle()}>
                  <option value="">{copy.allTags}</option>
                  {TAGS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
              <button onClick={() => setFavoritesOnly(!favoritesOnly)} style={{ border: `1px solid ${favoritesOnly ? "#FBBF24" : "rgba(255,255,255,0.14)"}`, background: favoritesOnly ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.04)", color: favoritesOnly ? "#FBBF24" : "rgba(255,255,255,0.72)", borderRadius: 14, minHeight: 44, fontWeight: 900, cursor: "pointer" }}>★ {copy.favorites}</button>
            </section>

            {loading && <div style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: 16 }}>Loading…</div>}

            {!loading && filtered.length === 0 && (
              <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{copy.noResults}</section>
            )}

            <section style={{ display: "grid", gap: 18 }}>
              {monthKeys.map((month) => (
                <div key={month} style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{monthLabel(`${month}-01`, lang)}</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    {grouped[month].map((entry) => {
                      const profile = profileById[entry.profile_id];
                      return (
                        <button key={entry.id} onClick={() => setSelectedEntry(entry)} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.045)", color: "#fff", borderRadius: 18, padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer" }}>
                          {entry.photoUrl ? (
                            <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", aspectRatio: "9 / 13", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} />
                          ) : (
                            <div style={{ width: "100%", aspectRatio: "9 / 13", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.035)", fontSize: 30 }}>{profile?.emoji || "📷"}</div>
                          )}
                          <div style={{ padding: 10, display: "grid", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                              <span style={{ color: profile?.color || "#34D399", fontSize: 11, fontWeight: 900 }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</span>
                              {entry.favorite && <span style={{ color: "#FBBF24", fontSize: 13 }}>★</span>}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 850 }}>{formatDate(entry.date, lang)}</div>
                            <div style={{ color: "rgba(255,255,255,0.46)", fontSize: 11 }}>{ageAtMemory(profile, entry.date, lang)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      {selectedEntry && (
        <MemoryDetail entry={selectedEntry} profile={profileById[selectedEntry.profile_id]} copy={copy} lang={lang} onClose={() => setSelectedEntry(null)} onToggleFavorite={() => toggleFavorite(selectedEntry)} />
      )}
    </main>
  );
}

function MemoryDetail({ entry, profile, copy, lang, onClose, onToggleFavorite }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1800, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <article role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 452, maxHeight: "92dvh", overflowY: "auto", background: "#111820", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, boxShadow: "0 24px 90px rgba(0,0,0,0.55)" }} onClick={(event) => event.stopPropagation()}>
        {entry.photoUrl && <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", maxHeight: 430, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} />}
        <div style={{ padding: 16, display: "grid", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ color: profile?.color || "#34D399", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.7px" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</div>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 24, lineHeight: 1.15, marginTop: 4 }}>{formatDate(entry.date, lang)}</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 }}>{ageAtMemory(profile, entry.date, lang)}</p>
            </div>
            <button onClick={onClose} aria-label={copy.close} style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 999, minWidth: 42, minHeight: 42, cursor: "pointer" }}>×</button>
          </div>
          <p style={{ color: entry.note ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.42)", lineHeight: 1.6, fontSize: 15 }}>{entry.note || copy.noteEmpty}</p>
          <button onClick={onToggleFavorite} style={{ border: `1px solid ${entry.favorite ? "#FBBF24" : "rgba(255,255,255,0.14)"}`, background: entry.favorite ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.05)", color: entry.favorite ? "#FBBF24" : "#fff", borderRadius: 15, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: "pointer" }}>
            {entry.favorite ? "★ " + copy.removeFavorite : "☆ " + copy.favorite}
          </button>
        </div>
      </article>
    </div>
  );
}

function FilterPill({ active, color = "#34D399", onClick, children }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, border: `1px solid ${active ? color : "rgba(255,255,255,0.14)"}`, background: active ? `${color}22` : "rgba(255,255,255,0.04)", color: active ? color : "rgba(255,255,255,0.72)", borderRadius: 999, padding: "9px 12px", minHeight: 42, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

const inputStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, padding: "13px 14px", font: "inherit", fontSize: 15 });
const selectStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 13, padding: 12, font: "inherit", minWidth: 0 });
