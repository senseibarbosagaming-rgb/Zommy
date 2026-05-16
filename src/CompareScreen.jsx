import { useEffect, useMemo, useState } from "react";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Then & Now",
    eyebrow: "Rediscoveries",
    subtitle: "Open this like a tiny time machine. Zommy looks for moments that make time visible — firsts, repeats, siblings, seasons, and that same little expression.",
    discoveries: "For you",
    sameAge: "Same age",
    sameDate: "Same day",
    thenNow: "Growing up",
    siblings: "Siblings",
    targetAge: "Age to rediscover",
    targetDate: "Day to revisit",
    child: "Child",
    months: (n) => `${n} months`,
    loading: "Searching the story…",
    noProfilesTitle: "Start the time machine",
    noProfiles: "Add a child profile and Zommy will begin surfacing firsts, repeats, and growth moments automatically.",
    noEntriesTitle: "Possibility, not emptiness",
    noEntries: "Save a few memories and this will become a feed of rediscovered moments — then vs now, birthdays, sibling echoes, and tiny details you forgot.",
    notEnoughTitle: "We found a few ways to begin",
    notEnough: "The match is still warming up. Try one of these prompts or save more memories to unlock richer rediscoveries.",
    closest: "Closest match",
    older: "Then",
    newer: "Now",
    tryPrompt: "Try this",
    createMemory: "Save a memory",
    addProfile: "Add child profile",
    dayApart: (days) => days === 1 ? "1 day apart" : `${days.toLocaleString()} days apart`,
    monthApart: (months) => months === 1 ? "1 month apart" : `${months.toLocaleString()} months apart`,
    sameAgeHint: "Finds each child closest to the same age so you can see what changed — or what somehow stayed exactly the same.",
    sameDateHint: "Revisits the same calendar day across different years: birthdays, holidays, seasons, and family rituals.",
    thenNowHint: "Pairs the earliest and latest memory for one child: the fastest way to feel time passing.",
    siblingHint: "Shows siblings around the same age — often the most shareable kind of family déjà vu.",
    discoveriesHint: "Auto-generated moments from the memories you already have. Imperfect is okay; the point is rediscovery.",
    prompts: [
      "Compare first and latest photo",
      "Compare birthdays",
      "Compare siblings at the same age",
      "Compare first steps vs running today",
      "Compare with a parent childhood photo",
      "Make a yearly growth reel",
    ],
    sampleCards: [
      { title: "First smile vs today", caption: "Same expression, a whole new child", accent: "😊" },
      { title: "6 months apart", caption: "Tiny hands then. Explorer hands now.", accent: "🖐️" },
      { title: "Sibling at the same age", caption: "Family resemblance becomes a story", accent: "👶" },
    ],
  },
  pt: {
    title: "Antes e agora",
    eyebrow: "Redescobertas",
    subtitle: "Abre isto como uma pequena máquina do tempo. O Zommy procura momentos que tornam o tempo visível — primeiras vezes, repetições, irmãos, estações e aquela mesma expressão.",
    discoveries: "Para ti",
    sameAge: "Mesma idade",
    sameDate: "Mesmo dia",
    thenNow: "A crescer",
    siblings: "Irmãos",
    targetAge: "Idade a redescobrir",
    targetDate: "Dia a revisitar",
    child: "Criança",
    months: (n) => `${n} meses`,
    loading: "A procurar na história…",
    noProfilesTitle: "Começa a máquina do tempo",
    noProfiles: "Adiciona um perfil de criança e o Zommy começa a revelar primeiras vezes, repetições e momentos de crescimento automaticamente.",
    noEntriesTitle: "Possibilidade, não vazio",
    noEntries: "Guarda algumas memórias e isto transforma-se num feed de redescobertas — antes e agora, aniversários, ecos entre irmãos e detalhes pequenos que esqueceste.",
    notEnoughTitle: "Encontrámos formas de começar",
    notEnough: "A correspondência ainda está a aquecer. Experimenta uma destas ideias ou guarda mais memórias para desbloquear redescobertas melhores.",
    closest: "Mais próxima",
    older: "Antes",
    newer: "Agora",
    tryPrompt: "Experimenta",
    createMemory: "Guardar memória",
    addProfile: "Adicionar criança",
    dayApart: (days) => days === 1 ? "1 dia de diferença" : `${days.toLocaleString("pt-PT")} dias de diferença`,
    monthApart: (months) => months === 1 ? "1 mês de diferença" : `${months.toLocaleString("pt-PT")} meses de diferença`,
    sameAgeHint: "Encontra cada criança perto da mesma idade para veres o que mudou — ou o que ficou exatamente igual.",
    sameDateHint: "Revisita o mesmo dia do calendário em anos diferentes: aniversários, feriados, estações e rituais da família.",
    thenNowHint: "Junta a primeira e a última memória de uma criança: a forma mais rápida de sentir o tempo a passar.",
    siblingHint: "Mostra irmãos com idades parecidas — muitas vezes o déjà vu familiar mais partilhável.",
    discoveriesHint: "Momentos gerados a partir das memórias que já tens. Não precisa ser perfeito; o ponto é redescobrir.",
    prompts: [
      "Comparar primeira e última foto",
      "Comparar aniversários",
      "Comparar irmãos à mesma idade",
      "Comparar primeiros passos com correr hoje",
      "Comparar com uma foto de infância dos pais",
      "Criar um vídeo anual de crescimento",
    ],
    sampleCards: [
      { title: "Primeiro sorriso vs hoje", caption: "A mesma expressão, uma criança nova", accent: "😊" },
      { title: "6 meses de diferença", caption: "Mãos pequeninas antes. Mãos de explorador agora.", accent: "🖐️" },
      { title: "Irmãos à mesma idade", caption: "A semelhança de família vira história", accent: "👶" },
    ],
  },
};

const AGE_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48];
const MODES = ["discoveries", "then-now", "same-age", "siblings", "same-date"];

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

const monthDistance = (from, to) => {
  const days = Math.abs(diffDays(from, to) ?? 0);
  return Math.max(1, Math.round(days / 30.44));
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
const uniqueCards = (cards) => {
  const seen = new Set();
  return cards.filter((card) => {
    const key = card.entries.map((entry) => entry.id).sort().join("|") || card.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cardFromPair = ({ title, caption, entries, profileById, tag = "Rediscovered", cta = "Watch them grow" }) => {
  const ordered = orderByDate(entries).slice(0, 2);
  const older = ordered[0];
  const newer = ordered[ordered.length - 1];
  return {
    title,
    caption,
    entries: ordered,
    tag,
    cta,
    meta: older && newer && older.id !== newer.id ? `${profileById[older.profile_id]?.emoji || "👶"} ${profileById[older.profile_id]?.name || "Memory"} · ${profileById[newer.profile_id]?.emoji || "👶"} ${profileById[newer.profile_id]?.name || "Memory"}` : "",
  };
};

const buildDiscoveryCards = ({ entries, profiles, profileById, copy, lang }) => {
  const cards = [];
  profiles.forEach((profile) => {
    const profileEntries = orderByDate(entries.filter((entry) => entry.profile_id === profile.id));
    if (profileEntries.length >= 2) {
      const first = profileEntries[0];
      const latest = profileEntries[profileEntries.length - 1];
      cards.push(cardFromPair({
        title: lang === "pt" ? `${profile.name}: primeira vs mais recente` : `${profile.name}: first vs latest`,
        caption: copy.monthApart(monthDistance(first.date, latest.date)),
        entries: [first, latest],
        profileById,
        tag: lang === "pt" ? "A crescer" : "Growing up",
        cta: lang === "pt" ? "Ver a mudança" : "See the change",
      }));
    }
  });

  const sameDayGroups = entries.reduce((groups, entry) => {
    const key = entry.date.slice(5, 10);
    groups[key] = [...(groups[key] || []), entry];
    return groups;
  }, {});
  Object.values(sameDayGroups).forEach((group) => {
    const ordered = orderByDate(group);
    if (ordered.length >= 2) {
      cards.push(cardFromPair({
        title: lang === "pt" ? "Mesmo dia, outro ano" : "Same day, another year",
        caption: `${formatDate(ordered[0].date, lang)} → ${formatDate(ordered[ordered.length - 1].date, lang)}`,
        entries: [ordered[0], ordered[ordered.length - 1]],
        profileById,
        tag: lang === "pt" ? "Ritual familiar" : "Family ritual",
        cta: lang === "pt" ? "Revisitar" : "Revisit",
      }));
    }
  });

  if (profiles.length > 1) {
    AGE_MONTHS.forEach((months) => {
      const matches = profiles.map((profile) => closestEntryAtAge(entries, profile, months)).filter(Boolean);
      if (matches.length >= 2) {
        cards.push(cardFromPair({
          title: lang === "pt" ? `Irmãos aos ${months} meses` : `Siblings at ${months} months`,
          caption: lang === "pt" ? "Mesmo ponto da vida, personalidades diferentes" : "Same point in life, different little people",
          entries: matches.slice(0, 2),
          profileById,
          tag: lang === "pt" ? "Mesmo idade" : "Same age",
          cta: lang === "pt" ? "Comparar irmãos" : "Compare siblings",
        }));
      }
    });
  }

  const noteMatches = entries.filter((entry) => /smile|sorriso|bath|banho|walk|passos|birthday|anivers/i.test(entry.note || ""));
  if (noteMatches.length >= 2) {
    const ordered = orderByDate(noteMatches);
    cards.push(cardFromPair({
      title: lang === "pt" ? "Aquele detalhe voltou" : "That little detail came back",
      caption: lang === "pt" ? "Encontrámos memórias com palavras parecidas" : "We found memories with a similar clue",
      entries: [ordered[0], ordered[ordered.length - 1]],
      profileById,
      tag: lang === "pt" ? "Expressão parecida" : "Similar moment",
      cta: lang === "pt" ? "Abrir descoberta" : "Open rediscovery",
    }));
  }

  return uniqueCards(cards).slice(0, 8);
};

export default function CompareScreen() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("discoveries");
  const [targetMonths, setTargetMonths] = useState(18);
  const [targetDate, setTargetDate] = useState(today());
  const [profileId, setProfileId] = useState("");

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 600 });
  const copy = useMemo(getCopy, []);
  const prefs = getPrefs();
  const lang = prefs.lang === "pt" ? "pt" : "en";
  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const selectedProfile = profiles.find((profile) => profile.id === profileId) || profiles[0];

  useEffect(() => {
    const showCompare = (event) => {
      if (event.detail?.profileId) setProfileId(event.detail.profileId);
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

  if (!open || !user) return null;

  const modeLabels = {
    discoveries: copy.discoveries,
    "same-age": copy.sameAge,
    "same-date": copy.sameDate,
    "then-now": copy.thenNow,
    siblings: copy.siblings,
  };

  const modeHint = {
    discoveries: copy.discoveriesHint,
    "same-age": copy.sameAgeHint,
    "same-date": copy.sameDateHint,
    "then-now": copy.thenNowHint,
    siblings: copy.siblingHint,
  }[mode];

  const discoveryCards = buildDiscoveryCards({ entries, profiles, profileById, copy, lang });
  const sameAgeMatches = profiles.map((profile) => closestEntryAtAge(entries, profile, targetMonths)).filter(Boolean);
  const sameDateMatches = entries.filter((entry) => entry.date.slice(5, 10) === targetDate.slice(5, 10)).sort((a, b) => b.date.localeCompare(a.date));
  const selectedEntries = selectedProfile ? orderByDate(entries.filter((entry) => entry.profile_id === selectedProfile.id)) : [];
  const thenNowMatches = selectedEntries.length > 1 ? [selectedEntries[0], selectedEntries[selectedEntries.length - 1]] : selectedEntries;
  const siblingMatches = profiles.map((profile) => closestEntryAtAge(entries, profile, targetMonths)).filter(Boolean);

  const comparisonEntries = mode === "same-age" ? sameAgeMatches
    : mode === "same-date" ? sameDateMatches
      : mode === "then-now" ? thenNowMatches
        : mode === "siblings" ? siblingMatches
          : [];

  const hasComparison = mode === "discoveries" ? discoveryCards.length > 0 : comparisonEntries.length >= 2;
  const emptyTitle = profiles.length === 0 ? copy.noProfilesTitle : entries.length === 0 ? copy.noEntriesTitle : copy.notEnoughTitle;
  const emptyMessage = profiles.length === 0 ? copy.noProfiles : entries.length === 0 ? copy.noEntries : copy.notEnough;

  const renderMemoryPanel = (entry, index, label) => {
    const profile = profileById[entry.profile_id];
    return (
      <div key={`${entry.id}-${index}`} style={{ minWidth: 0, borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", height: 206, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block", background: "#000" }} />
        ) : (
          <div style={{ height: 206, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${profile?.color || "#FBBF24"}55, rgba(255,255,255,0.05))`, fontSize: 36 }}>{profile?.emoji || "📷"}</div>
        )}
        <div style={{ padding: 12, display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span style={{ color: profile?.color || "#FBBF24", fontSize: 10, fontWeight: 950, letterSpacing: "0.7px", textTransform: "uppercase" }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.48)", fontSize: 11, fontWeight: 800 }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</span>
          </div>
          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, fontWeight: 650, lineHeight: 1.22 }}>{formatDate(entry.date, lang)}</div>
          {profile?.birthdate && <div style={{ color: "rgba(255,255,255,0.54)", fontSize: 12 }}>{ageLabel(profile.birthdate, entry.date, lang)}</div>}
          {entry.note && <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.45, margin: 0 }}>{entry.note}</p>}
        </div>
      </div>
    );
  };

  const renderDiscoveryCard = (card, index) => {
    const days = card.entries.length >= 2 ? Math.abs(diffDays(card.entries[0].date, card.entries[1].date) ?? 0) : 0;
    return (
      <article key={`${card.title}-${index}`} style={{ borderRadius: 26, overflow: "hidden", background: "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045))", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {card.entries.map((entry, entryIndex) => renderMemoryPanel(entry, entryIndex, entryIndex === 0 ? copy.older : copy.newer))}
        </div>
        <div style={{ padding: "2px 16px 17px", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#F2C879", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.8px" }}>{card.tag}</span>
            {days > 0 && <span style={{ color: "rgba(255,255,255,0.52)", fontSize: 11, fontWeight: 850 }}>{copy.dayApart(days)}</span>}
          </div>
          <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 24, lineHeight: 1.08, margin: 0, fontWeight: 650 }}>{card.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.66)", margin: 0, fontSize: 13, lineHeight: 1.45 }}>{card.caption}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: 800 }}>{card.meta}</span>
            <span style={{ border: "1px solid rgba(242,200,121,0.35)", color: "#F2C879", borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 950 }}>{card.cta}</span>
          </div>
        </div>
      </article>
    );
  };

  const renderPromptState = () => (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ border: "1px solid rgba(242,200,121,0.28)", borderRadius: 24, padding: 20, background: "radial-gradient(circle at top left, rgba(242,200,121,0.20), rgba(255,255,255,0.045) 52%, rgba(255,255,255,0.03))" }}>
        <div style={{ color: "#F2C879", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.9px", marginBottom: 8 }}>{copy.eyebrow}</div>
        <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 28, lineHeight: 1.08, margin: "0 0 8px", fontWeight: 650 }}>{emptyTitle}</h2>
        <p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.5, margin: 0, fontSize: 14 }}>{emptyMessage}</p>
        <button onClick={() => window.dispatchEvent(new CustomEvent(profiles.length ? "zommy:open-memory-composer" : "zommy:open-profile-creator", { detail: { profileId: selectedProfile?.id || "" } }))} style={{ marginTop: 16, width: "100%", border: "none", background: "#F2C879", color: "#2B2119", borderRadius: 16, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: "pointer" }}>
          {profiles.length ? copy.createMemory : copy.addProfile}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {copy.sampleCards.map((card, index) => (
          <article key={card.title} style={{ minHeight: 122, borderRadius: 22, padding: 15, display: "grid", gridTemplateColumns: "74px 1fr", gap: 13, alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ height: 74, borderRadius: 20, display: "grid", placeItems: "center", fontSize: 30, background: `linear-gradient(145deg, rgba(242,200,121,${0.28 + index * 0.08}), rgba(143,185,168,0.22))` }}>{card.accent}</div>
            <div>
              <div style={{ color: "#F2C879", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 5 }}>{copy.tryPrompt}</div>
              <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, margin: "0 0 4px", lineHeight: 1.12 }}>{card.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 1.4, margin: 0 }}>{card.caption}</p>
            </div>
          </article>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {copy.prompts.map((prompt) => (
          <button key={prompt} onClick={() => setMode(prompt.toLowerCase().includes("sibling") || prompt.toLowerCase().includes("irmãos") ? "siblings" : "then-now")} style={{ flexShrink: 0, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.72)", borderRadius: 999, padding: "10px 12px", fontSize: 12, fontWeight: 850, cursor: "pointer" }}>
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "linear-gradient(180deg, #101418 0%, #151A1E 58%, #201915 100%)", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 16px 112px" }}>
        <header style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <div style={{ color: "#F2C879", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "1px" }}>{copy.eyebrow}</div>
          <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 40, lineHeight: 1, fontWeight: 650, margin: 0 }}>{copy.title}</h1>
          <p style={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.5, fontSize: 13, margin: 0 }}>{mode === "discoveries" ? copy.subtitle : modeHint}</p>
        </header>

        <nav aria-label="Rediscovery modes" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 10 }}>
          {MODES.map((item) => (
            <button key={item} onClick={() => setMode(item)} style={{ flexShrink: 0, border: `1px solid ${mode === item ? "#F2C879" : "rgba(255,255,255,0.14)"}`, background: mode === item ? "rgba(242,200,121,0.16)" : "transparent", color: mode === item ? "#F2C879" : "rgba(255,255,255,0.7)", borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 850, cursor: "pointer" }}>
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

        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 42 }}>{copy.loading}</div>
        ) : mode === "discoveries" && hasComparison ? (
          <section style={{ display: "grid", gap: 14 }}>
            {discoveryCards.map(renderDiscoveryCard)}
          </section>
        ) : mode !== "discoveries" && hasComparison ? (
          <section style={{ display: "grid", gridTemplateColumns: comparisonEntries.length === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
            {comparisonEntries.slice(0, mode === "same-date" ? 6 : 2).map((entry, index) => renderMemoryPanel(entry, index, mode === "then-now" ? (index === 0 ? copy.older : copy.newer) : mode === "same-age" || mode === "siblings" ? copy.closest : modeLabels[mode]))}
          </section>
        ) : renderPromptState()}
      </div>
    </main>
  );
}

const fieldLabel = () => ({ display: "grid", gap: 7, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 });
const controlStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 12, font: "inherit" });
