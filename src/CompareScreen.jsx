import { useEffect, useMemo, useState } from "react";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Compare memories",
    sameAge: "Same age",
    sameDate: "Same date",
    thenNow: "Then vs now",
    siblings: "Sibling comparison",
    random: "Random memory",
    targetAge: "Target age",
    targetDate: "Date to compare",
    child: "Child",
    months: (n) => `${n} months`,
    noProfiles: "Add profiles first to compare memories.",
    noEntries: "Add a few memories first. Compare gets better with real material.",
    notEnough: "Not enough matching memories for this mode yet.",
    closest: "Closest match",
    older: "Then",
    newer: "Now",
    shuffle: "Shuffle random pair",
    sameDateHint: "Compares the same calendar day across different years.",
    sameAgeHint: "Finds the memory closest to the selected age for each child.",
    thenNowHint: "Shows the earliest and latest memory for one child.",
    siblingHint: "Shows siblings around the same age, not random moments.",
    randomHint: "Still here for serendipity, but no longer the whole feature.",
  },
  pt: {
    title: "Comparar memórias",
    sameAge: "Mesma idade",
    sameDate: "Mesmo dia",
    thenNow: "Antes e agora",
    siblings: "Comparação entre irmãos",
    random: "Memória aleatória",
    targetAge: "Idade alvo",
    targetDate: "Data a comparar",
    child: "Criança",
    months: (n) => `${n} meses`,
    noProfiles: "Adiciona perfis primeiro para comparar memórias.",
    noEntries: "Adiciona algumas memórias primeiro. Comparar fica melhor com material real.",
    notEnough: "Ainda não há memórias suficientes para este modo.",
    closest: "Mais próxima",
    older: "Antes",
    newer: "Agora",
    shuffle: "Trocar par aleatório",
    sameDateHint: "Compara o mesmo dia do calendário em anos diferentes.",
    sameAgeHint: "Encontra a memória mais próxima da idade escolhida para cada criança.",
    thenNowHint: "Mostra a primeira e a última memória de uma criança.",
    siblingHint: "Mostra irmãos por idade parecida, não por momentos aleatórios.",
    randomHint: "Continua aqui pela surpresa, mas já não é a funcionalidade toda.",
  },
};

const AGE_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48];
const MODES = ["same-age", "same-date", "then-now", "siblings", "random"];

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const diffDays = (from, to) => {
  if (!from || !to) return null;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const value = Math.floor((end - start) / 86400000);
  return Number.isFinite(value) ? value : null;
};

const ageLabel = (birthdate, date, lang) => {
  const days = diffDays(birthdate, date);
  if (days == null || days < 0) return "";
  const months = Math.round(days / 30.44);
  const years = Math.floor(days / 365.25);
  const remainingMonths = Math.max(0, months - years * 12);

  if (lang === "pt") {
    if (years >= 1) return `${years} ano${years !== 1 ? "s" : ""}${remainingMonths ? ` e ${remainingMonths} mes${remainingMonths !== 1 ? "es" : ""}` : ""}`;
    return `${months} mes${months !== 1 ? "es" : ""}`;
  }

  if (years >= 1) return `${years} year${years !== 1 ? "s" : ""}${remainingMonths ? `, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}` : ""}`;
  return `${months} month${months !== 1 ? "s" : ""}`;
};

const closestEntryAtAge = (entries, profile, targetMonths) => {
  const targetDays = targetMonths * 30.44;
  return entries
    .filter((entry) => entry.profile_id === profile.id)
    .map((entry) => ({ entry, distance: Math.abs((diffDays(profile.birthdate, entry.date) ?? Infinity) - targetDays) }))
    .filter((item) => Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance)[0]?.entry || null;
};

const orderByDate = (items) => [...items].sort((a, b) => a.date.localeCompare(b.date));

export default function CompareScreen() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("same-age");
  const [targetMonths, setTargetMonths] = useState(18);
  const [targetDate, setTargetDate] = useState(today());
  const [profileId, setProfileId] = useState("");
  const [randomPair, setRandomPair] = useState([]);

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 600 });
  const copy = useMemo(getCopy, []);
  const prefs = getPrefs();
  const lang = prefs.lang === "pt" ? "pt" : "en";
  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const selectedProfile = profiles.find((profile) => profile.id === profileId) || profiles[0];

  useEffect(() => {
    const showCompare = () => {
      setOpen(true);
      refresh();
    };
    const hideCompare = () => setOpen(false);

    window.addEventListener("zommy:show-compare", showCompare);
    window.addEventListener("zommy:hide-compare", hideCompare);
    return () => {
      window.removeEventListener("zommy:show-compare", showCompare);
      window.removeEventListener("zommy:hide-compare", hideCompare);
    };
  }, [refresh]);

  useEffect(() => {
    if (!profileId && profiles[0]?.id) setProfileId(profiles[0].id);
    if (profileId && !profiles.some((profile) => profile.id === profileId)) setProfileId(profiles[0]?.id || "");
  }, [profileId, profiles]);

  const shuffleRandom = () => {
    if (entries.length < 2) {
      setRandomPair(entries.slice(0, 1));
      return;
    }
    const firstIndex = Math.floor(Math.random() * entries.length);
    let secondIndex = Math.floor(Math.random() * (entries.length - 1));
    if (secondIndex >= firstIndex) secondIndex += 1;
    setRandomPair(orderByDate([entries[firstIndex], entries[secondIndex]]));
  };

  useEffect(() => {
    if (open && mode === "random" && entries.length) shuffleRandom();
  }, [open, mode, entries.length]);

  if (!open || !user) return null;

  const modeLabels = {
    "same-age": copy.sameAge,
    "same-date": copy.sameDate,
    "then-now": copy.thenNow,
    siblings: copy.siblings,
    random: copy.random,
  };

  const modeHint = {
    "same-age": copy.sameAgeHint,
    "same-date": copy.sameDateHint,
    "then-now": copy.thenNowHint,
    siblings: copy.siblingHint,
    random: copy.randomHint,
  }[mode];

  const sameAgeMatches = profiles
    .map((profile) => closestEntryAtAge(entries, profile, targetMonths))
    .filter(Boolean);

  const sameDateMatches = entries
    .filter((entry) => entry.date.slice(5, 10) === targetDate.slice(5, 10))
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedEntries = selectedProfile ? orderByDate(entries.filter((entry) => entry.profile_id === selectedProfile.id)) : [];
  const thenNowMatches = selectedEntries.length > 1
    ? [selectedEntries[0], selectedEntries[selectedEntries.length - 1]]
    : selectedEntries;

  const siblingMatches = profiles
    .map((profile) => closestEntryAtAge(entries, profile, targetMonths))
    .filter(Boolean);

  const displayEntries = mode === "same-age" ? sameAgeMatches
    : mode === "same-date" ? sameDateMatches
      : mode === "then-now" ? thenNowMatches
        : mode === "siblings" ? siblingMatches
          : randomPair;

  const needsAtLeastTwo = ["same-age", "same-date", "then-now", "siblings", "random"].includes(mode);
  const hasEnough = needsAtLeastTwo ? displayEntries.length >= 2 : displayEntries.length > 0;
  const emptyMessage = profiles.length === 0 ? copy.noProfiles : entries.length === 0 ? copy.noEntries : copy.notEnough;

  const renderCard = (entry, index) => {
    const profile = profileById[entry.profile_id];
    const label = mode === "then-now" ? (index === 0 ? copy.older : copy.newer) : mode === "same-age" || mode === "siblings" ? copy.closest : modeLabels[mode];
    return (
      <article key={`${entry.id}-${index}`} style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, overflow: "hidden", minWidth: 0 }}>
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", height: 210, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block", background: "#000" }} />
        ) : (
          <div style={{ height: 210, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.04)", fontSize: 34 }}>{profile?.emoji || "📷"}</div>
        )}
        <div style={{ padding: 13, display: "grid", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span style={{ color: profile?.color || "#FBBF24", fontSize: 11, fontWeight: 900, letterSpacing: "0.7px", textTransform: "uppercase" }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700 }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</span>
          </div>
          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 650, lineHeight: 1.25 }}>{formatDate(entry.date, lang)}</div>
          {profile?.birthdate && <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12 }}>{ageLabel(profile.birthdate, entry.date, lang)}</div>}
          {entry.note && <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>{entry.note}</p>}
        </div>
      </article>
    );
  };

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 16px 112px" }}>
        <header style={{ display: "grid", gap: 7, marginBottom: 16 }}>
          <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.08, fontWeight: 650 }}>{copy.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.58)", lineHeight: 1.45, fontSize: 13 }}>{modeHint}</p>
        </header>

        <nav aria-label="Compare modes" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 10 }}>
          {MODES.map((item) => (
            <button key={item} onClick={() => { setMode(item); if (item === "random") shuffleRandom(); }} style={{ flexShrink: 0, border: `1px solid ${mode === item ? "#FBBF24" : "rgba(255,255,255,0.14)"}`, background: mode === item ? "rgba(251,191,36,0.16)" : "transparent", color: mode === item ? "#FBBF24" : "rgba(255,255,255,0.7)", borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 850, cursor: "pointer" }}>
              {modeLabels[item]}
            </button>
          ))}
        </nav>

        {(mode === "same-age" || mode === "siblings") && (
          <label style={fieldLabel()}>
            {copy.targetAge}
            <select value={targetMonths} onChange={(event) => setTargetMonths(Number(event.target.value))} style={controlStyle()}>
              {AGE_MONTHS.map((item) => <option key={item} value={item}>{copy.months(item)}</option>)}
            </select>
          </label>
        )}

        {mode === "same-date" && (
          <label style={fieldLabel()}>
            {copy.targetDate}
            <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} style={controlStyle()} />
          </label>
        )}

        {mode === "then-now" && profiles.length > 1 && (
          <label style={fieldLabel()}>
            {copy.child}
            <select value={selectedProfile?.id || ""} onChange={(event) => setProfileId(event.target.value)} style={controlStyle()}>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.emoji || "👶"} {profile.name}</option>)}
            </select>
          </label>
        )}

        {mode === "random" && entries.length > 1 && (
          <button onClick={shuffleRandom} style={{ width: "100%", marginBottom: 14, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "rgba(255,255,255,0.76)", borderRadius: 14, minHeight: 48, padding: 12, fontSize: 14, fontWeight: 850, cursor: "pointer" }}>
            ⇄ {copy.shuffle}
          </button>
        )}

        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 42 }}>Loading…</div>
        ) : !hasEnough ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 18, padding: 28, color: "rgba(255,255,255,0.52)", textAlign: "center", lineHeight: 1.55 }}>{emptyMessage}</div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: displayEntries.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
            {displayEntries.slice(0, mode === "same-date" ? 6 : 2).map(renderCard)}
          </section>
        )}
      </div>
    </main>
  );
}

const fieldLabel = () => ({ display: "grid", gap: 7, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 });
const controlStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 12, font: "inherit" });
