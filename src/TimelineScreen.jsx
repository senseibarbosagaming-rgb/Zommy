import { useEffect, useMemo, useState } from "react";
import MemoryDetailModal from "./MemoryDetailModal";
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
    allAges: "All ages",
    allTags: "All tags",
    favorites: "Favorites",
    memoriesTab: "Memories",
    chaptersTab: "Chapters",
    calendarTab: "Calendar",
    onThisDay: "On this day",
    noChildren: "Add a child first to build a timeline.",
    noResults: "No memories match this view yet.",
    noCalendar: "No memories in this month.",
    noOnThisDay: "No memories from this day in previous years yet.",
    noChapters: "Chapters will appear here as monthly stories are drafted or locked.",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"}`,
    chapters: (count) => `${count} ${count === 1 ? "chapter" : "chapters"}`,
    addMemory: "Add memory",
    openChapter: "Open chapter",
    locked: "Locked",
    draft: "Draft",
    age0to3: "0–3 months",
    firstYear: "First year",
    age1: "Age 1",
    age2: "Age 2",
    age3plus: "Age 3+",
  },
  pt: {
    title: "Timeline",
    allChildren: "Todas as crianças",
    search: "Pesquisar memórias",
    searchPlaceholder: "avó, praia, primeira palavra…",
    allYears: "Todos os anos",
    allAges: "Todas as idades",
    allTags: "Todas as tags",
    favorites: "Favoritas",
    memoriesTab: "Memórias",
    chaptersTab: "Capítulos",
    calendarTab: "Calendário",
    onThisDay: "Neste dia",
    noChildren: "Adiciona uma criança para criar uma timeline.",
    noResults: "Ainda não há memórias com estes filtros.",
    noCalendar: "Sem memórias neste mês.",
    noOnThisDay: "Ainda não há memórias deste dia em anos anteriores.",
    noChapters: "Os capítulos vão aparecer aqui como histórias mensais em rascunho ou fechadas.",
    memories: (count) => `${count} ${count === 1 ? "memória" : "memórias"}`,
    chapters: (count) => `${count} ${count === 1 ? "capítulo" : "capítulos"}`,
    addMemory: "Adicionar memória",
    openChapter: "Abrir capítulo",
    locked: "Fechado",
    draft: "Rascunho",
    age0to3: "0–3 meses",
    firstYear: "Primeiro ano",
    age1: "1 ano",
    age2: "2 anos",
    age3plus: "3+ anos",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const todayIso = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const formatDate = (date, lang) => new Date(`${date}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "short",
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

const ageFilterMatch = (filter, profile, entryDate) => {
  if (!filter) return true;
  if (!profile?.birthdate) return false;
  const days = diffDays(profile.birthdate, entryDate);
  if (days == null || days < 0) return false;
  const years = Math.floor(days / 365.25);
  if (filter === "0-3m") return days <= 92;
  if (filter === "first-year") return days < 365;
  if (filter === "age-1") return years === 1;
  if (filter === "age-2") return years === 2;
  if (filter === "age-3-plus") return years >= 3;
  return true;
};

const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);

const monthDays = (ym) => {
  const [year, month] = ym.split("-").map(Number);
  const total = new Date(year, month, 0).getDate();
  return Array.from({ length: total }, (_, index) => `${ym}-${String(index + 1).padStart(2, "0")}`);
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
  const [age, setAge] = useState("");
  const [tag, setTag] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState("memories");
  const [calendarMonth, setCalendarMonth] = useState(todayIso().slice(0, 7));
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 800 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const loadChapters = async () => {
    if (!user) return;
    setChaptersLoading(true);
    const { data, error } = await supabase
      .from("capsules")
      .select("*")
      .order("period_start", { ascending: false });
    if (!error) setChapters(data || []);
    setChaptersLoading(false);
  };

  useEffect(() => {
    const show = (event) => {
      const requestedProfileId = event.detail?.profileId;
      if (requestedProfileId) setProfileId(requestedProfileId);
      setOpen(true);
      refresh();
      loadChapters();
    };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-timeline", show);
    window.addEventListener("zommy:hide-timeline", hide);
    return () => {
      window.removeEventListener("zommy:show-timeline", show);
      window.removeEventListener("zommy:hide-timeline", hide);
    };
  }, [refresh, user]);

  useEffect(() => {
    if (profileId !== "all" && !profiles.some((profile) => profile.id === profileId)) setProfileId("all");
  }, [profileId, profiles]);

  useEffect(() => {
    if (open && viewMode === "chapters") loadChapters();
  }, [open, viewMode, user]);

  if (!open || !user) return null;

  const years = Array.from(new Set(entries.map((entry) => entry.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const normalizedQuery = query.trim().toLowerCase();
  const today = todayIso();

  const filtered = entries.filter((entry) => {
    const profile = profileById[entry.profile_id];
    const note = (entry.note || "").toLowerCase();
    const name = (profile?.name || "").toLowerCase();
    if (profileId !== "all" && entry.profile_id !== profileId) return false;
    if (normalizedQuery && !note.includes(normalizedQuery) && !name.includes(normalizedQuery)) return false;
    if (year && entry.date.slice(0, 4) !== year) return false;
    if (!ageFilterMatch(age, profile, entry.date)) return false;
    if (tag && !(entry.tags || []).includes(tag)) return false;
    if (favoritesOnly && !entry.favorite) return false;
    return true;
  });

  const filteredChapters = chapters.filter((chapter) => profileId === "all" || chapter.profile_id === profileId);
  const onThisDayEntries = filtered.filter((entry) => sameMonthDay(entry.date, today) && entry.date.slice(0, 4) !== today.slice(0, 4));
  const calendarEntries = filtered.filter((entry) => entry.date.startsWith(calendarMonth));
  const calendarByDay = calendarEntries.reduce((map, entry) => {
    const next = new Map(map);
    next.set(entry.date, [...(next.get(entry.date) || []), entry]);
    return next;
  }, new Map());
  const visibleEntries = viewMode === "on-this-day" ? onThisDayEntries : viewMode === "calendar" ? calendarEntries : filtered;
  const grouped = groupByMonth(visibleEntries);
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const openComposer = () => {
    const targetProfile = profileId !== "all" ? profiles.find((profile) => profile.id === profileId) : profiles[0];
    window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: targetProfile?.id || "" } }));
  };

  const emptyText = viewMode === "calendar" ? copy.noCalendar : viewMode === "on-this-day" ? copy.noOnThisDay : copy.noResults;
  const countLabel = viewMode === "chapters" ? copy.chapters(filteredChapters.length) : copy.memories(visibleEntries.length);

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 12px 112px", display: "grid", gap: 14 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 4px" }}>
          <div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.08, fontWeight: 650 }}>{copy.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.58)", marginTop: 4, fontSize: 13 }}>{countLabel}</p>
          </div>
          <button onClick={openComposer} style={{ border: "none", background: "#34D399", color: "#101418", borderRadius: 999, padding: "11px 13px", minHeight: 44, fontWeight: 950, cursor: "pointer" }}>+ {copy.addMemory}</button>
        </header>

        {profiles.length === 0 ? (
          <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{copy.noChildren}</section>
        ) : (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, padding: "0 4px" }}>
              <ModeTab active={viewMode === "memories"} onClick={() => setViewMode("memories")}>{copy.memoriesTab}</ModeTab>
              <ModeTab active={viewMode === "chapters"} tone="#A78BFA" onClick={() => setViewMode("chapters")}>{copy.chaptersTab}</ModeTab>
              <ModeTab active={viewMode === "calendar"} tone="#60A5FA" onClick={() => setViewMode("calendar")}>{copy.calendarTab}</ModeTab>
              <ModeTab active={viewMode === "on-this-day"} tone="#FBBF24" onClick={() => setViewMode("on-this-day")}>{copy.onThisDay}</ModeTab>
            </section>

            <section style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 4px 2px" }}>
              <FilterPill active={profileId === "all"} onClick={() => setProfileId("all")}>{copy.allChildren}</FilterPill>
              {profiles.map((profile) => (
                <FilterPill key={profile.id} active={profileId === profile.id} color={profile.color} onClick={() => setProfileId(profile.id)}>{profile.emoji || "👶"} {profile.name}</FilterPill>
              ))}
            </section>

            {viewMode !== "chapters" && (
              <section style={{ display: "grid", gap: 9, padding: "0 4px" }}>
                <label style={labelStyle()}>
                  {copy.search}
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} style={inputStyle()} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select value={year} onChange={(event) => setYear(event.target.value)} style={selectStyle()}>
                    <option value="">{copy.allYears}</option>
                    {years.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={age} onChange={(event) => setAge(event.target.value)} style={selectStyle()}>
                    <option value="">{copy.allAges}</option>
                    <option value="0-3m">{copy.age0to3}</option>
                    <option value="first-year">{copy.firstYear}</option>
                    <option value="age-1">{copy.age1}</option>
                    <option value="age-2">{copy.age2}</option>
                    <option value="age-3-plus">{copy.age3plus}</option>
                  </select>
                </div>
                <select value={tag} onChange={(event) => setTag(event.target.value)} style={selectStyle()}>
                  <option value="">{copy.allTags}</option>
                  {TAGS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <button onClick={() => setFavoritesOnly(!favoritesOnly)} style={toggleButton(favoritesOnly, "#FBBF24")}>★ {copy.favorites}</button>
              </section>
            )}

            {viewMode === "calendar" && (
              <section style={{ display: "grid", gap: 10, padding: "0 4px" }}>
                <input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} style={selectStyle()} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {monthDays(calendarMonth).map((day) => {
                    const count = calendarByDay.get(day)?.length || 0;
                    return (
                      <button key={day} onClick={() => count && setYear(day.slice(0, 4))} style={{ minHeight: 47, border: `1px solid ${count ? "#34D399" : "rgba(255,255,255,0.1)"}`, background: count ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.035)", color: count ? "#34D399" : "rgba(255,255,255,0.48)", borderRadius: 12, fontWeight: 850, cursor: count ? "pointer" : "default" }}>
                        <div>{Number(day.slice(8, 10))}</div>
                        {count > 0 && <div style={{ fontSize: 10, marginTop: 2 }}>{count}</div>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {(loading || chaptersLoading) && <div style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: 16 }}>Loading…</div>}

            {viewMode === "chapters" ? (
              <ChaptersView chapters={filteredChapters} entries={entries} profiles={profiles} copy={copy} />
            ) : (
              <>
                {!loading && visibleEntries.length === 0 && (
                  <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{emptyText}</section>
                )}

                <section style={{ display: "grid", gap: 18 }}>
                  {monthKeys.map((month) => (
                    <div key={month} style={{ display: "grid", gap: 10 }}>
                      <h2 style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase", padding: "0 4px" }}>{monthLabel(`${month}-01`, lang)}</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                        {grouped[month].map((entry) => <MemoryCard key={entry.id} entry={entry} profile={profileById[entry.profile_id]} lang={lang} onClick={() => setSelectedEntry(entry)} />)}
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {selectedEntry && (
        <MemoryDetailModal
          entry={selectedEntry}
          profile={profileById[selectedEntry.profile_id]}
          user={user}
          lang={lang}
          onClose={() => setSelectedEntry(null)}
          onChanged={async () => {
            await refresh();
            setSelectedEntry(null);
          }}
        />
      )}
    </main>
  );
}

function ChaptersView({ chapters, entries, profiles, copy }) {
  if (!chapters.length) {
    return <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{copy.noChapters}</section>;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {chapters.map((chapter) => {
        const profile = profiles.find((item) => item.id === chapter.profile_id);
        const chapterEntries = entries.filter((entry) => entry.profile_id === chapter.profile_id && entry.date >= chapter.period_start && entry.date <= chapter.period_end);
        const cover = chapterEntries.find((entry) => entry.photoUrl);
        return (
          <article key={chapter.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.04)", boxShadow: "0 18px 50px rgba(0,0,0,0.22)" }}>
            {cover?.photoUrl ? <img src={cover.photoUrl} alt={chapter.title} style={{ width: "100%", height: 206, objectFit: "cover", display: "block" }} /> : <div style={{ height: 170, display: "grid", placeItems: "center", fontSize: 42, background: "rgba(255,255,255,0.03)" }}>{profile?.emoji || "📖"}</div>}
            <div style={{ padding: 17, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ color: chapter.status === "locked" ? "#FBBF24" : (profile?.color || "#34D399"), fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{chapter.status === "locked" ? copy.locked : copy.draft}</div>
                <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 12 }}>{copy.memories(chapterEntries.length)}</div>
              </div>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 27, lineHeight: 1.08, fontWeight: 650 }}>{chapter.title}</h2>
              {chapter.letter && <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.65, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{chapter.letter}</p>}
              <button onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: chapter.profile_id } }))} style={{ justifySelf: "start", border: "none", background: profile?.color || "#34D399", color: "#101418", borderRadius: 999, padding: "11px 14px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>{copy.openChapter}</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function MemoryCard({ entry, profile, lang, onClick }) {
  return (
    <button aria-label={`${profile?.name || "Child"} memory from ${entry.date}`} onClick={onClick} style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.045)", color: "#fff", borderRadius: 13, padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer", position: "relative", aspectRatio: "3 / 4", minWidth: 0 }}>
      {entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.035)", fontSize: 26 }}>{profile?.emoji || "📷"}</div>}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.36), transparent 34%, rgba(0,0,0,0.52))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, pointerEvents: "none" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: profile?.color || "#34D399", boxShadow: "0 1px 6px rgba(0,0,0,0.35)" }} />
        {entry.favorite && <span style={{ color: "#FBBF24", fontSize: 12, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>★</span>}
      </div>
      <div style={{ position: "absolute", left: 7, right: 7, bottom: 7, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 4, pointerEvents: "none" }}>
        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, lineHeight: 1.05, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</span>
        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 9, fontWeight: 850, whiteSpace: "nowrap" }}>{formatDate(entry.date, lang)}</span>
      </div>
    </button>
  );
}

function ModeTab({ active, tone = "#34D399", onClick, children }) {
  return <button onClick={onClick} style={{ border: `1px solid ${active ? tone : "rgba(255,255,255,0.12)"}`, background: active ? `${tone}22` : "rgba(255,255,255,0.035)", color: active ? tone : "rgba(255,255,255,0.66)", borderRadius: 14, minHeight: 42, padding: "8px 6px", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>{children}</button>;
}

function FilterPill({ active, color = "#34D399", onClick, children }) {
  return <button onClick={onClick} style={{ flexShrink: 0, border: `1px solid ${active ? color : "rgba(255,255,255,0.14)"}`, background: active ? `${color}22` : "rgba(255,255,255,0.04)", color: active ? color : "rgba(255,255,255,0.72)", borderRadius: 999, padding: "9px 12px", minHeight: 42, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>{children}</button>;
}

const labelStyle = () => ({ display: "grid", gap: 6, color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const inputStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, padding: "13px 14px", font: "inherit", fontSize: 15 });
const selectStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 13, padding: 12, font: "inherit", minWidth: 0 });
const toggleButton = (active, color) => ({ border: `1px solid ${active ? color : "rgba(255,255,255,0.14)"}`, background: active ? `${color}26` : "rgba(255,255,255,0.04)", color: active ? color : "rgba(255,255,255,0.72)", borderRadius: 14, minHeight: 44, fontWeight: 900, cursor: "pointer" });
