import { useEffect, useMemo, useState } from "react";
import MemoryDetailModal from "./MemoryDetailModal";
import { appSurface, contentFrame, palette, type } from "./designSystem";
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
    filters: "Filters",
    hideFilters: "Hide",
    activeFilters: (count) => `${count} active`,
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
    filters: "Filtros",
    hideFilters: "Esconder",
    activeFilters: (count) => `${count} ativo${count === 1 ? "" : "s"}`,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const showProfileFilter = profiles.length > 1;
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
    window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: targetProfile?.id || "", restoreDraft: false } }));
  };

  const emptyText = viewMode === "calendar" ? copy.noCalendar : viewMode === "on-this-day" ? copy.noOnThisDay : copy.noResults;
  const countLabel = viewMode === "chapters" ? copy.chapters(filteredChapters.length) : copy.memories(visibleEntries.length);
  const activeFilterCount = [normalizedQuery, year, age, tag, favoritesOnly].filter(Boolean).length;

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame(124)}>
        <header style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "-18px -16px 0", padding: "calc(18px + env(safe-area-inset-top, 0px)) 16px 10px", background: "rgba(255,253,248,0.82)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${palette.border}` }}>
          <div>
            <h1 style={{ fontFamily: type.serif, fontSize: 24, lineHeight: 1.08, fontWeight: 650 }}>{copy.title}</h1>
            <p style={{ color: palette.inkFaint, marginTop: 2, fontSize: 12 }}>{countLabel}</p>
          </div>
          {viewMode !== "chapters" && (
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((current) => !current)}
              style={filterToggleButton(filtersOpen, activeFilterCount)}
            >
              <span>{filtersOpen ? copy.hideFilters : copy.filters}</span>
              {activeFilterCount > 0 && <span style={filterCountBadge()}>{activeFilterCount}</span>}
            </button>
          )}
        </header>

        {profiles.length === 0 ? (
          <section style={{ border: `1px dashed ${palette.borderStrong}`, borderRadius: 20, padding: 24, color: palette.inkMuted, textAlign: "center", lineHeight: 1.55 }}>{copy.noChildren}</section>
        ) : (
          <>
            <section style={{ display: "flex", gap: 7, overflowX: "auto", padding: "1px 4px 2px" }}>
              <ModeTab active={viewMode === "memories"} onClick={() => setViewMode("memories")}>{copy.memoriesTab}</ModeTab>
              <ModeTab active={viewMode === "chapters"} tone={palette.lavender} onClick={() => setViewMode("chapters")}>{copy.chaptersTab}</ModeTab>
              <ModeTab active={viewMode === "calendar"} tone={palette.sage} onClick={() => setViewMode("calendar")}>{copy.calendarTab}</ModeTab>
              <ModeTab active={viewMode === "on-this-day"} tone={palette.honey} onClick={() => setViewMode("on-this-day")}>{copy.onThisDay}</ModeTab>
            </section>

            {showProfileFilter && (
              <section style={{ display: "flex", gap: 7, overflowX: "auto", padding: "0 4px 2px" }}>
                <FilterPill active={profileId === "all"} onClick={() => setProfileId("all")}>{copy.allChildren}</FilterPill>
                {profiles.map((profile) => (
                  <FilterPill key={profile.id} active={profileId === profile.id} color={profile.color} onClick={() => setProfileId(profile.id)}>{profile.emoji || "👶"} {profile.name}</FilterPill>
                ))}
              </section>
            )}

            {viewMode !== "chapters" && filtersOpen && (
              <section style={{ display: "grid", gap: 8, padding: "8px 4px 3px" }}>
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
                <button onClick={() => setFavoritesOnly(!favoritesOnly)} style={toggleButton(favoritesOnly, palette.honey)}>★ {copy.favorites}</button>
              </section>
            )}

            {viewMode === "calendar" && (
              <section style={{ display: "grid", gap: 8, padding: "0 4px" }}>
                <input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} style={selectStyle()} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                  {monthDays(calendarMonth).map((day) => {
                    const count = calendarByDay.get(day)?.length || 0;
                    return (
                      <button key={day} onClick={() => count && setYear(day.slice(0, 4))} style={{ minHeight: 39, border: `1px solid ${count ? palette.sage : palette.border}`, background: count ? "rgba(52,211,153,0.13)" : "rgba(255,253,248,0.54)", color: count ? palette.sage : palette.inkFaint, borderRadius: 10, fontSize: 12, fontWeight: 850, cursor: count ? "pointer" : "default" }}>
                        <div>{Number(day.slice(8, 10))}</div>
                        {count > 0 && <div style={{ fontSize: 9, marginTop: 1 }}>{count}</div>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {(loading || chaptersLoading) && <div style={{ color: palette.inkFaint, textAlign: "center", padding: 12 }}>Loading…</div>}

            {viewMode === "chapters" ? (
              <ChaptersView chapters={filteredChapters} entries={entries} profiles={profiles} copy={copy} />
            ) : (
              <>
                {!loading && visibleEntries.length === 0 && (
                  <section style={{ border: `1px dashed ${palette.borderStrong}`, borderRadius: 20, padding: 24, color: palette.inkMuted, textAlign: "center", lineHeight: 1.55 }}>{emptyText}</section>
                )}

                <section style={{ display: "grid", gap: 16 }}>
                  {monthKeys.map((month) => (
                    <div key={month} style={{ display: "grid", gap: 8 }}>
                      <h2 style={{ color: palette.inkFaint, fontSize: 11, fontWeight: 900, letterSpacing: "0.7px", textTransform: "uppercase", padding: "0 4px" }}>{monthLabel(`${month}-01`, lang)}</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5 }}>
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

      {profiles.length > 0 && (
        <button onClick={openComposer} aria-label={copy.addMemory} style={{ position: "fixed", right: "calc(18px + env(safe-area-inset-right, 0px))", bottom: "calc(92px + env(safe-area-inset-bottom, 0px))", zIndex: 910, width: 50, height: 50, border: "none", borderRadius: 999, background: palette.sage, color: palette.ink, fontSize: 30, fontWeight: 800, lineHeight: 1, boxShadow: palette.shadow, cursor: "pointer" }}>+</button>
      )}

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
    return <section style={{ border: `1px dashed ${palette.borderStrong}`, borderRadius: 20, padding: 24, color: palette.inkMuted, textAlign: "center", lineHeight: 1.55 }}>{copy.noChapters}</section>;
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {chapters.map((chapter) => {
        const profile = profiles.find((item) => item.id === chapter.profile_id);
        const chapterEntries = entries.filter((entry) => entry.profile_id === chapter.profile_id && entry.date >= chapter.period_start && entry.date <= chapter.period_end);
        const cover = chapterEntries.find((entry) => entry.photoUrl);
        return (
          <article key={chapter.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 22, overflow: "hidden", background: "rgba(255,253,248,0.78)", boxShadow: palette.shadowSoft }}>
            {cover?.photoUrl ? <img src={cover.photoUrl} alt={chapter.title} style={{ width: "100%", height: 186, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, display: "grid", placeItems: "center", fontSize: 38, background: "rgba(255,248,239,0.74)" }}>{profile?.emoji || "📖"}</div>}
            <div style={{ padding: 15, display: "grid", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ color: chapter.status === "locked" ? palette.honey : (profile?.color || palette.sage), fontSize: 10, fontWeight: 900, letterSpacing: "0.7px", textTransform: "uppercase" }}>{chapter.status === "locked" ? copy.locked : copy.draft}</div>
                <div style={{ color: palette.inkFaint, fontSize: 12 }}>{copy.memories(chapterEntries.length)}</div>
              </div>
              <h2 style={{ fontFamily: type.serif, fontSize: 24, lineHeight: 1.08, fontWeight: 650 }}>{chapter.title}</h2>
              {chapter.letter && <p style={{ color: palette.inkMuted, lineHeight: 1.6, fontSize: 14, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{chapter.letter}</p>}
              <button onClick={() => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: chapter.profile_id } }))} style={{ justifySelf: "start", border: "none", background: profile?.color || palette.sage, color: palette.ink, borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>{copy.openChapter}</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function MemoryCard({ entry, profile, lang, onClick }) {
  return (
    <button aria-label={`${profile?.name || "Child"} memory from ${entry.date}`} onClick={onClick} style={{ border: `1px solid ${palette.border}`, background: "rgba(255,253,248,0.70)", color: palette.ink, borderRadius: 12, padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer", position: "relative", aspectRatio: "3 / 4", minWidth: 0 }}>
      {entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "rgba(255,248,239,0.74)", fontSize: 24 }}>{profile?.emoji || "📷"}</div>}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.28), transparent 36%, rgba(0,0,0,0.5))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, pointerEvents: "none" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: profile?.color || palette.sage, boxShadow: "0 1px 6px rgba(0,0,0,0.35)" }} />
        {entry.favorite && <span style={{ color: palette.honey, fontSize: 12, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>★</span>}
      </div>
      <div style={{ position: "absolute", left: 6, right: 6, bottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 4, pointerEvents: "none" }}>
        <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 10, lineHeight: 1.05, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</span>
        <span style={{ color: palette.inkMuted, fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{formatDate(entry.date, lang)}</span>
      </div>
    </button>
  );
}

function ModeTab({ active, tone = palette.sage, onClick, children }) {
  return <button onClick={onClick} style={{ flex: "0 0 auto", border: `1px solid ${active ? tone : palette.border}`, background: active ? `${tone}18` : "rgba(255,253,248,0.60)", color: active ? tone : palette.inkMuted, borderRadius: 999, height: 33, padding: "0 11px", fontSize: 12, lineHeight: "33px", whiteSpace: "nowrap", fontWeight: 850, cursor: "pointer" }}>{children}</button>;
}

function FilterPill({ active, color = palette.sage, onClick, children }) {
  return <button onClick={onClick} style={{ flexShrink: 0, border: `1px solid ${active ? color : palette.border}`, background: active ? `${color}18` : "rgba(255,253,248,0.60)", color: active ? color : palette.inkMuted, borderRadius: 999, padding: "7px 10px", minHeight: 33, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{children}</button>;
}

const filterToggleButton = (open, activeCount) => ({
  border: `1px solid ${open || activeCount ? "rgba(52,211,153,0.55)" : palette.border}`,
  background: open || activeCount ? "rgba(52,211,153,0.11)" : "rgba(255,253,248,0.68)",
  color: open || activeCount ? palette.sage : palette.inkMuted,
  borderRadius: 999,
  minHeight: 34,
  padding: "0 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
});

const filterCountBadge = () => ({
  minWidth: 18,
  height: 18,
  display: "grid",
  placeItems: "center",
  background: "rgba(52,211,153,0.18)",
  color: palette.sage,
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
});

const labelStyle = () => ({ display: "grid", gap: 5, color: palette.inkFaint, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px" });
const inputStyle = () => ({ width: "100%", border: `1px solid ${palette.border}`, background: "rgba(255,253,248,0.74)", color: palette.ink, borderRadius: 12, padding: "11px 12px", font: "inherit", fontSize: 15 });
const selectStyle = () => ({ border: `1px solid ${palette.border}`, background: palette.paper, color: palette.ink, borderRadius: 12, padding: "10px 11px", font: "inherit", minWidth: 0, fontSize: 13 });
const toggleButton = (active, color) => ({ border: `1px solid ${active ? color : palette.border}`, background: active ? `${color}22` : "rgba(255,253,248,0.70)", color: active ? color : palette.inkMuted, borderRadius: 12, minHeight: 39, fontSize: 13, fontWeight: 850, cursor: "pointer" });
