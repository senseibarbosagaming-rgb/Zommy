import { useEffect, useMemo, useState } from "react";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Today",
    addMemory: (name) => `Add a memory for ${name}`,
    viewTimeline: "View timeline",
    findMemory: "Find memory",
    ageLine: (age) => age,
    weekCount: (count) => `${count} ${count === 1 ? "memory" : "memories"} this week`,
    noWeek: "No memories saved this week yet.",
    onThisDay: "On this day",
    yearsAgo: (years) => `${years} year${years === 1 ? "" : "s"} ago today`,
    latest: "Latest memory",
    favorite: "Favorite memory",
    promptTitle: "Tiny thing worth saving",
    promptBody: "What did they say, do, ask, mispronounce, break, invent, or make funny today?",
    promptCta: "Write it down",
    draftTitle: "Draft waiting",
    draftBody: "You started a memory. Finish it before the details disappear.",
    queuedTitle: "Waiting to upload",
    queuedBody: (count) => `${count} offline ${count === 1 ? "memory" : "memories"} will upload when the connection is back.`,
    emptyLatest: "No memories yet. Start with one photo from today.",
    totalMemories: "total memories",
  },
  pt: {
    today: "Hoje",
    addMemory: (name) => `Adicionar memória de ${name}`,
    viewTimeline: "Ver timeline",
    findMemory: "Encontrar memória",
    ageLine: (age) => age,
    weekCount: (count) => `${count} ${count === 1 ? "memória" : "memórias"} esta semana`,
    noWeek: "Ainda não guardaste memórias esta semana.",
    onThisDay: "Neste dia",
    yearsAgo: (years) => `Há ${years} ano${years === 1 ? "" : "s"} neste dia`,
    latest: "Última memória",
    favorite: "Memória favorita",
    promptTitle: "Coisa pequena para guardar",
    promptBody: "O que disse, fez, perguntou, inventou, partiu, confundiu ou tornou engraçado hoje?",
    promptCta: "Guardar agora",
    draftTitle: "Rascunho à espera",
    draftBody: "Começaste uma memória. Termina antes que os detalhes desapareçam.",
    queuedTitle: "À espera de upload",
    queuedBody: (count) => `${count} ${count === 1 ? "memória offline" : "memórias offline"} vai carregar quando a ligação voltar.`,
    emptyLatest: "Ainda não há memórias. Começa com uma foto de hoje.",
    totalMemories: "memórias no total",
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

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const diffDays = (from, to) => {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.floor((end - start) / 86400000);
};

const childAge = (birthdate, lang) => {
  if (!birthdate) return "";
  const days = Math.max(0, diffDays(birthdate, todayIso()));
  const totalMonths = Math.floor(days / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (lang === "pt") {
    if (years <= 0) return `${Math.max(0, totalMonths)} mes${totalMonths === 1 ? "" : "es"}`;
    return `${years} ano${years === 1 ? "" : "s"}${months ? ` e ${months} mes${months === 1 ? "" : "es"}` : ""}`;
  }

  if (years <= 0) return `${Math.max(0, totalMonths)} month${totalMonths === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"}${months ? `, ${months} month${months === 1 ? "" : "s"}` : ""}`;
};

const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);
const yearsBetween = (from, to) => parseInt(to.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);

const startOfWeek = () => {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export default function TodayDashboardLayer() {
  const [open, setOpen] = useState(false);
  const { user, profiles, entries, draft, queuedCount, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: true, entryLimit: 80 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const activeProfile = profiles[0];
  const today = todayIso();
  const weekStart = startOfWeek();

  useEffect(() => {
    const show = () => { setOpen(true); refresh(); };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-today", show);
    window.addEventListener("zommy:hide-today", hide);
    setOpen(true);
    return () => {
      window.removeEventListener("zommy:show-today", show);
      window.removeEventListener("zommy:hide-today", hide);
    };
  }, [refresh]);

  if (!open || !user || !activeProfile) return null;

  const childEntries = entries.filter((entry) => entry.profile_id === activeProfile.id);
  const latestEntry = childEntries[0];
  const favoriteEntry = childEntries.find((entry) => entry.favorite);
  const anniversary = childEntries.find((entry) => sameMonthDay(entry.date, today) && yearsBetween(entry.date, today) > 0);
  const weeklyCount = childEntries.filter((entry) => entry.date >= weekStart).length;
  const featureEntry = anniversary || favoriteEntry || latestEntry;

  const openComposer = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: activeProfile.id, restoreDraft: false } }));
  const openDraft = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { restoreDraft: true } }));
  const openTimeline = () => document.querySelectorAll("nav[aria-label='Main navigation'] button")?.[1]?.click?.();
  const openFind = () => Array.from(document.querySelectorAll("button")).find((button) => /find|encontrar/i.test(button.innerText || ""))?.click?.();

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", padding: "20px 18px 112px", display: "grid", gap: 14 }}>
        <header style={{ display: "grid", gap: 8, paddingTop: 4 }}>
          <div style={{ color: activeProfile.color || "#34D399", fontSize: 12, fontWeight: 900, letterSpacing: "0.8px", textTransform: "uppercase" }}>{copy.today}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.06, fontWeight: 650 }}>{activeProfile.name}</h1>
              <p style={{ color: "rgba(255,255,255,0.64)", marginTop: 5, fontSize: 14 }}>{copy.ageLine(childAge(activeProfile.birthdate, lang))}</p>
            </div>
            <div style={{ width: 58, height: 58, borderRadius: 20, background: `${activeProfile.color || "#34D399"}22`, color: activeProfile.color || "#34D399", display: "grid", placeItems: "center", fontSize: 31 }}>{activeProfile.emoji || "👶"}</div>
          </div>
        </header>

        <button onClick={openComposer} style={{ border: "none", background: activeProfile.color || "#34D399", color: "#101418", borderRadius: 20, padding: "17px 18px", minHeight: 58, fontSize: 16, fontWeight: 950, textAlign: "center", boxShadow: `0 18px 46px ${(activeProfile.color || "#34D399")}28`, cursor: "pointer" }}>
          + {copy.addMemory(activeProfile.name)}
        </button>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={openTimeline} style={secondaryButton()}>{copy.viewTimeline}</button>
          <button onClick={openFind} style={secondaryButton()}>{copy.findMemory}</button>
        </section>

        {(draft || queuedCount > 0) && (
          <section style={{ display: "grid", gap: 10 }}>
            {draft && <StatusCard title={copy.draftTitle} body={copy.draftBody} cta={copy.promptCta} onClick={openDraft} tone="#FBBF24" />}
            {queuedCount > 0 && <StatusCard title={copy.queuedTitle} body={copy.queuedBody(queuedCount)} tone="#60A5FA" />}
          </section>
        )}

        <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, overflow: "hidden", background: "rgba(255,255,255,0.045)" }}>
          {featureEntry?.photoUrl ? (
            <img src={featureEntry.photoUrl} alt={`${activeProfile.name} memory`} style={{ width: "100%", height: 238, objectFit: "cover", objectPosition: featureEntry.cover_position || "50% 50%", display: "block" }} />
          ) : (
            <div style={{ height: 186, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.36)", fontSize: 36, background: "rgba(255,255,255,0.035)" }}>{activeProfile.emoji || "📷"}</div>
          )}
          <div style={{ padding: 15, display: "grid", gap: 8 }}>
            <div style={{ color: anniversary ? "#A78BFA" : favoriteEntry ? "#FBBF24" : "rgba(255,255,255,0.54)", fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>
              {anniversary ? copy.onThisDay : favoriteEntry ? copy.favorite : copy.latest}
            </div>
            {featureEntry ? (
              <>
                <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 21, lineHeight: 1.22, fontWeight: 650 }}>
                  {anniversary ? copy.yearsAgo(yearsBetween(anniversary.date, today)) : formatDate(featureEntry.date, lang)}
                </h2>
                {featureEntry.note && <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.55, fontSize: 14 }}>{featureEntry.note}</p>}
              </>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.55, fontSize: 14 }}>{copy.emptyLatest}</p>
            )}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={metricCard()}>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{childEntries.length}</div>
            <div style={{ color: "rgba(255,255,255,0.54)", fontSize: 12 }}>{copy.totalMemories}</div>
          </div>
          <div style={metricCard()}>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{weeklyCount}</div>
            <div style={{ color: "rgba(255,255,255,0.54)", fontSize: 12 }}>{weeklyCount ? copy.weekCount(weeklyCount) : copy.noWeek}</div>
          </div>
        </section>

        <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: 15, background: "linear-gradient(180deg, rgba(52,211,153,0.12), rgba(255,255,255,0.035))", display: "grid", gap: 9 }}>
          <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 22, fontWeight: 650 }}>{copy.promptTitle}</h2>
          <p style={{ color: "rgba(255,255,255,0.66)", lineHeight: 1.58, fontSize: 14 }}>{copy.promptBody}</p>
          <button onClick={openComposer} style={{ justifySelf: "start", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 999, padding: "10px 13px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>{copy.promptCta}</button>
        </section>

        {loading && <div style={{ color: "rgba(255,255,255,0.42)", textAlign: "center", padding: 18 }}>Loading…</div>}
      </div>
    </main>
  );
}

function secondaryButton() {
  return { border: "1px solid rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 16, minHeight: 49, padding: "12px", fontSize: 14, fontWeight: 900, cursor: "pointer" };
}

function metricCard() {
  return { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.045)", borderRadius: 18, padding: 14, minHeight: 82, display: "grid", alignContent: "center", gap: 4 };
}

function StatusCard({ title, body, cta, onClick, tone = "#34D399" }) {
  const content = (
    <>
      <div style={{ color: tone, fontSize: 13, fontWeight: 950 }}>{title}</div>
      <p style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, lineHeight: 1.5 }}>{body}</p>
      {cta && <div style={{ justifySelf: "start", background: tone, color: "#101418", borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 950 }}>{cta}</div>}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} style={{ width: "100%", textAlign: "left", border: `1px solid ${tone}55`, background: `${tone}16`, borderRadius: 18, padding: 14, display: "grid", gap: 7, cursor: "pointer" }}>
        {content}
      </button>
    );
  }

  return (
    <article style={{ border: `1px solid ${tone}55`, background: `${tone}16`, borderRadius: 18, padding: 14, display: "grid", gap: 7 }}>
      {content}
    </article>
  );
}
