import { useEffect, useMemo, useState } from "react";
import MemoryDetailModal from "./MemoryDetailModal";
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
    calendar: "Calendar",
    archive: "Archive",
    onThisDay: "On this day",
    noChildren: "Add a child first to build a timeline.",
    noResults: "No memories match this view yet.",
    noCalendar: "No memories in this month.",
    noOnThisDay: "No memories from this day in previous years yet.",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"}`,
    addMemory: "Add memory",
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
    calendar: "Calendário",
    archive: "Arquivo",
    onThisDay: "Neste dia",
    noChildren: "Adiciona uma criança para criar uma timeline.",
    noResults: "Ainda não há memórias com estes filtros.",
    noCalendar: "Sem memórias neste mês.",
    noOnThisDay: "Ainda não há memórias deste dia em anos anteriores.",
    memories: (count) => `${count} ${count === 1 ? "memória" : "memórias"}`,
    addMemory: "Adicionar memória",
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
  const [viewMode, setViewMode] = useState("archive");
  const [calendarMonth, setCalendarMonth] = useState(todayIso().slice(0, 7));
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 800 });
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

  const onThisDayEntries = filtered.filter((entry) => sameMonthDay(entry.date, today) && entry.date.slice(0, 4) !== today.slice(0, 4));
  const calendarEntries = filtered.filter((entry) => entry.date.startsWith(calendarMonth));
  const calendarByDay = calendarEntries.reduce((map, entry) => {
    const next = new Map(map);
    next.set(entry.date, [...(next.get(entry.date) || []), entry]);
    return next;
  }, new Map());
  const visibleEntries = viewMode === "today" ? onThisDayEntries : viewMode === "calendar" ? calendarEntries : filtered;
  const grouped = groupByMonth(visibleEntries);
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const openComposer = () => {
    const targetProfile = profileId !== "all" ? profiles.find((profile) => profile.id === profileId) : profiles[0];
    window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: targetProfile?.id || "" } }));
  };

  const emptyText = viewMode === "calendar" ? copy.noCalendar : viewMode === "today" ? copy.noOnThisDay : copy.noResults;

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 16px 112px", display: "grid", gap: 14 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.08, fontWeight: 650 }}>{copy.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.58)", marginTop: 4, fontSize: 13 }}>{copy.memories(visibleEntries.length)}</p>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setFavoritesOnly(!favoritesOnly)} style={toggleButton(favoritesOnly, "#FBBF24")}>★ {copy.favorites}</button>
                <button onClick={() => setViewMode(viewMode === "calendar" ? "archive" : "calendar")} style={toggleButton(viewMode === "calendar", "#60A5FA")}>▦ {copy.calendar}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setViewMode("archive")} style={toggleButton(viewMode === "archive", "#34D399")}>{copy.archive}</button>
                <button onClick={() => setViewMode(viewMode === "today" ? "archive" : "today")} style={toggleButton(viewMode === "today", "#A78BFA")}>⏳ {copy.onThisDay}</button>
              </div>
            </section>

            {viewMode === "calendar" && (
              <section style={{ display: "grid", gap: 10 }}>
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

            {loading && <div style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: 16 }}>Loading…</div>}

            {!loading && visibleEntries.length === 0 && (
              <section style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 20, padding: 24, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 1.55 }}>{emptyText}</section>
            )}

            <section style={{ display: "grid", gap: 18 }}>
              {monthKeys.map((month) => (
                <div key={month} style={{ display: "grid", gap: 10 }}>
                  <h2 style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{monthLabel(`${month}-01`, lang)}</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    {grouped[month].map((entry) => <MemoryCard key={entry.id} entry={entry} profile={profileById[entry.profile_id]} lang={lang} onClick={() => setSelectedEntry(entry)} />)}
                  </div>
                </div>
              ))}
            </section>
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

function MemoryCard({ entry, profile, lang, onClick }) {
  return (
    <button onClick={onClick} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.045)", color: "#fff", borderRadius: 18, padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer" }}>
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
}

function FilterPill({ active, color = "#34D399", onClick, children }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, border: `1px solid ${active ? color : "rgba(255,255,255,0.14)"}`, background: active ? `${color}22` : "rgba(255,255,255,0.04)", color: active ? color : "rgba(255,255,255,0.72)", borderRadius: 999, padding: "9px 12px", minHeight: 42, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

const labelStyle = () => ({ display: "grid", gap: 6, color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const inputStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, padding: "13px 14px", font: "inherit", fontSize: 15 });
const selectStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 13, padding: 12, font: "inherit", minWidth: 0 });
const toggleButton = (active, color) => ({ border: `1px solid ${active ? color : "rgba(255,255,255,0.14)"}`, background: active ? `${color}26` : "rgba(255,255,255,0.04)", color: active ? color : "rgba(255,255,255,0.72)", borderRadius: 14, minHeight: 44, fontWeight: 900, cursor: "pointer" });
