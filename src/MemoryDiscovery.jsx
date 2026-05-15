import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

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
    open: "Find",
    close: "Close",
    title: "Find memories",
    search: "Search notes",
    searchPlaceholder: "dog, first word, grandma, beach…",
    allYears: "All years",
    allAges: "All ages",
    allTags: "All tags",
    favorites: "Favorites",
    calendar: "Calendar",
    today: "Today in previous years",
    results: (n) => `${n} ${n === 1 ? "memory" : "memories"}`,
    noResults: "No memories match this yet.",
    noToday: "No memories from this day in previous years yet.",
    noCalendar: "No memories in this month.",
    noteEmpty: "No note",
    age0to3: "0–3 months",
    firstYear: "First year",
    age1: "Age 1",
    age2: "Age 2",
    age3plus: "Age 3+",
    star: "Favorite",
    unstar: "Remove favorite",
    tags: "Tags",
  },
  pt: {
    open: "Encontrar",
    close: "Fechar",
    title: "Encontrar memórias",
    search: "Pesquisar notas",
    searchPlaceholder: "cão, primeira palavra, avó, praia…",
    allYears: "Todos os anos",
    allAges: "Todas as idades",
    allTags: "Todas as tags",
    favorites: "Favoritas",
    calendar: "Calendário",
    today: "Neste dia em anos anteriores",
    results: (n) => `${n} ${n === 1 ? "memória" : "memórias"}`,
    noResults: "Ainda não há memórias com estes filtros.",
    noToday: "Ainda não há memórias deste dia em anos anteriores.",
    noCalendar: "Sem memórias neste mês.",
    noteEmpty: "Sem nota",
    age0to3: "0–3 meses",
    firstYear: "Primeiro ano",
    age1: "1 ano",
    age2: "2 anos",
    age3plus: "3+ anos",
    star: "Favorita",
    unstar: "Remover favorita",
    tags: "Tags",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const formatDate = (date, lang) => new Date(`${date}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const diffDays = (from, to) => {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.floor((end - start) / 86400000);
};

const ageYears = (birthdate, date) => Math.floor(diffDays(birthdate, date) / 365.25);

const ageLabel = (profile, entryDate, copy) => {
  if (!profile?.birthdate) return "";
  const days = diffDays(profile.birthdate, entryDate);
  if (days < 0) return "";
  if (days <= 92) return copy.age0to3;
  if (days < 365) return copy.firstYear;
  const years = ageYears(profile.birthdate, entryDate);
  if (years === 1) return copy.age1;
  if (years === 2) return copy.age2;
  return copy.age3plus;
};

const ageFilterMatch = (filter, profile, entryDate) => {
  if (!filter) return true;
  if (!profile?.birthdate) return false;
  const days = diffDays(profile.birthdate, entryDate);
  const years = ageYears(profile.birthdate, entryDate);
  if (filter === "0-3m") return days >= 0 && days <= 92;
  if (filter === "first-year") return days >= 0 && days < 365;
  if (filter === "age-1") return years === 1;
  if (filter === "age-2") return years === 2;
  if (filter === "age-3-plus") return years >= 3;
  return true;
};

const isSameMonthDay = (date, target) => date.slice(5, 10) === target.slice(5, 10);

const getPrivatePhotoUrl = async (pathOrUrl) => {
  if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl) || /^data:/i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(pathOrUrl, 60 * 60);
  if (error) return "";
  return data.signedUrl;
};

const monthDays = (ym) => {
  const [year, month] = ym.split("-").map(Number);
  const total = new Date(year, month, 0).getDate();
  return Array.from({ length: total }, (_, index) => `${ym}-${String(index + 1).padStart(2, "0")}`);
};

export default function MemoryDiscovery() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [age, setAge] = useState("");
  const [tag, setTag] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [mode, setMode] = useState("results");
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7));

  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const loadData = async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setLoading(false); return; }

    const [{ data: profileRows }, { data: entryRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", currentUser.id).order("created_at"),
      supabase.from("entries").select("*").eq("user_id", currentUser.id).order("date", { ascending: false }),
    ]);

    const signedEntries = await Promise.all((entryRows || []).map(async (entry) => {
      const coverPath = entry.cover_photo_path || entry.photo_path || entry.photo || entry.photos?.[0]?.path;
      return {
        ...entry,
        tags: entry.tags || [],
        favorite: Boolean(entry.favorite),
        photo: await getPrivatePhotoUrl(coverPath),
      };
    }));

    setProfiles(profileRows || []);
    setEntries(signedEntries);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  const years = useMemo(() => Array.from(new Set(entries.map((entry) => entry.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a)), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const profile = profileById[entry.profile_id];
      const note = (entry.note || "").toLowerCase();
      const name = (profile?.name || "").toLowerCase();
      if (q && !note.includes(q) && !name.includes(q)) return false;
      if (year && entry.date.slice(0, 4) !== year) return false;
      if (!ageFilterMatch(age, profile, entry.date)) return false;
      if (tag && !(entry.tags || []).includes(tag)) return false;
      if (favoritesOnly && !entry.favorite) return false;
      return true;
    });
  }, [age, entries, favoritesOnly, profileById, query, tag, year]);

  const todayMatches = useMemo(() => {
    const target = today();
    return entries.filter((entry) => isSameMonthDay(entry.date, target) && entry.date.slice(0, 4) !== target.slice(0, 4));
  }, [entries]);

  const calendarMatches = useMemo(() => filtered.filter((entry) => entry.date.startsWith(calendarMonth)), [calendarMonth, filtered]);
  const calendarByDay = useMemo(() => {
    const map = new Map();
    calendarMatches.forEach((entry) => {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date).push(entry);
    });
    return map;
  }, [calendarMatches]);

  const toggleFavorite = async (entry) => {
    const nextFavorite = !entry.favorite;
    setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, favorite: nextFavorite } : item));
    await supabase.from("entries").update({ favorite: nextFavorite }).eq("id", entry.id).eq("user_id", user.id);
  };

  const toggleTag = async (entry, tagId) => {
    const currentTags = entry.tags || [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter((item) => item !== tagId)
      : [...currentTags, tagId];

    setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, tags: nextTags } : item));
    await supabase.from("entries").update({ tags: nextTags }).eq("id", entry.id).eq("user_id", user.id);
  };

  const renderCard = (entry) => {
    const profile = profileById[entry.profile_id];
    return (
      <article key={entry.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.045)" }}>
        {entry.photo && <img src={entry.photo} alt="" style={{ width: "100%", height: 190, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} />}
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div style={{ color: profile?.color || "#34D399", fontSize: 12, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</div>
              <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 650, marginTop: 3 }}>{formatDate(entry.date, lang)}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>{ageLabel(profile, entry.date, copy)}</div>
            </div>
            <button onClick={() => toggleFavorite(entry)} aria-label={entry.favorite ? copy.unstar : copy.star} style={{ border: "1px solid rgba(255,255,255,0.14)", background: entry.favorite ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.04)", color: entry.favorite ? "#FBBF24" : "rgba(255,255,255,0.62)", borderRadius: 999, width: 39, height: 39, fontSize: 19, cursor: "pointer" }}>
              {entry.favorite ? "★" : "☆"}
            </button>
          </div>

          <p style={{ color: entry.note ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.38)", lineHeight: 1.55, fontSize: 14 }}>{entry.note || copy.noteEmpty}</p>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {TAGS.map((item) => {
              const selected = (entry.tags || []).includes(item.id);
              return (
                <button key={item.id} onClick={() => toggleTag(entry, item.id)} style={{ border: `1px solid ${selected ? profile?.color || "#34D399" : "rgba(255,255,255,0.13)"}`, background: selected ? `${profile?.color || "#34D399"}24` : "transparent", color: selected ? profile?.color || "#34D399" : "rgba(255,255,255,0.6)", borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </article>
    );
  };

  if (!user && !open) {
    return null;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ position: "fixed", right: 16, bottom: 92, zIndex: 1090, border: "1px solid rgba(255,255,255,0.18)", background: "#111820", color: "#fff", borderRadius: 999, padding: "10px 14px", fontWeight: 900, fontSize: 13, boxShadow: "0 10px 32px rgba(0,0,0,0.28)", cursor: "pointer" }}>
        🔎 {copy.open}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1400, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "18px 16px calc(26px + env(safe-area-inset-bottom, 0px))" }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 29, fontWeight: 650 }}>{copy.title}</h1>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>{copy.close}</button>
            </header>

            <section style={{ display: "grid", gap: 10, marginBottom: 13 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.56)", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                {copy.search}
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, padding: "13px 14px", font: "inherit", fontSize: 15 }} />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={year} onChange={(event) => setYear(event.target.value)} style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 11, font: "inherit" }}>
                  <option value="">{copy.allYears}</option>
                  {years.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={age} onChange={(event) => setAge(event.target.value)} style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 11, font: "inherit" }}>
                  <option value="">{copy.allAges}</option>
                  <option value="0-3m">{copy.age0to3}</option>
                  <option value="first-year">{copy.firstYear}</option>
                  <option value="age-1">{copy.age1}</option>
                  <option value="age-2">{copy.age2}</option>
                  <option value="age-3-plus">{copy.age3plus}</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                <button onClick={() => { setMode("results"); setTag(""); }} style={{ flexShrink: 0, border: `1px solid ${mode === "results" && !tag ? "#fff" : "rgba(255,255,255,0.14)"}`, background: mode === "results" && !tag ? "rgba(255,255,255,0.14)" : "transparent", color: "#fff", borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 850 }}>{copy.allTags}</button>
                {TAGS.map((item) => (
                  <button key={item.id} onClick={() => { setMode("results"); setTag(tag === item.id ? "" : item.id); }} style={{ flexShrink: 0, border: `1px solid ${tag === item.id ? "#34D399" : "rgba(255,255,255,0.14)"}`, background: tag === item.id ? "rgba(52,211,153,0.16)" : "transparent", color: tag === item.id ? "#34D399" : "rgba(255,255,255,0.7)", borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 850 }}>{item.label}</button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => { setMode("results"); setFavoritesOnly(!favoritesOnly); }} style={{ border: `1px solid ${favoritesOnly ? "#FBBF24" : "rgba(255,255,255,0.14)"}`, background: favoritesOnly ? "rgba(251,191,36,0.16)" : "transparent", color: favoritesOnly ? "#FBBF24" : "rgba(255,255,255,0.72)", borderRadius: 12, padding: 10, fontWeight: 850 }}>★ {copy.favorites}</button>
                <button onClick={() => setMode(mode === "calendar" ? "results" : "calendar")} style={{ border: `1px solid ${mode === "calendar" ? "#60A5FA" : "rgba(255,255,255,0.14)"}`, background: mode === "calendar" ? "rgba(96,165,250,0.16)" : "transparent", color: mode === "calendar" ? "#60A5FA" : "rgba(255,255,255,0.72)", borderRadius: 12, padding: 10, fontWeight: 850 }}>▦ {copy.calendar}</button>
              </div>
              <button onClick={() => setMode(mode === "today" ? "results" : "today")} style={{ border: `1px solid ${mode === "today" ? "#A78BFA" : "rgba(255,255,255,0.14)"}`, background: mode === "today" ? "rgba(167,139,250,0.16)" : "transparent", color: mode === "today" ? "#A78BFA" : "rgba(255,255,255,0.72)", borderRadius: 12, padding: 11, fontWeight: 850 }}>⏳ {copy.today}</button>
            </section>

            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 40 }}>Loading…</div>
            ) : mode === "calendar" ? (
              <section style={{ display: "grid", gap: 12 }}>
                <input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 11, font: "inherit" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {monthDays(calendarMonth).map((day) => {
                    const count = calendarByDay.get(day)?.length || 0;
                    return (
                      <button key={day} onClick={() => { if (count) { setQuery(""); setYear(day.slice(0, 4)); setMode("results"); } }} style={{ minHeight: 47, border: `1px solid ${count ? "#34D399" : "rgba(255,255,255,0.1)"}`, background: count ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.035)", color: count ? "#34D399" : "rgba(255,255,255,0.48)", borderRadius: 12, fontWeight: 850, cursor: count ? "pointer" : "default" }}>
                        <div>{Number(day.slice(8, 10))}</div>
                        {count > 0 && <div style={{ fontSize: 10, marginTop: 2 }}>{count}</div>}
                      </button>
                    );
                  })}
                </div>
                {calendarMatches.length ? calendarMatches.map(renderCard) : <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 34 }}>{copy.noCalendar}</div>}
              </section>
            ) : mode === "today" ? (
              <section style={{ display: "grid", gap: 12 }}>
                {todayMatches.length ? todayMatches.map(renderCard) : <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 34 }}>{copy.noToday}</div>}
              </section>
            ) : (
              <section style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 13, fontWeight: 800 }}>{copy.results(filtered.length)}</div>
                {filtered.length ? filtered.map(renderCard) : <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 34 }}>{copy.noResults}</div>}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
