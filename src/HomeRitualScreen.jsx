import { useEffect, useMemo, useState } from "react";
import { monthBounds } from "./capsuleCore";
import { appSurface, card, contentFrame, label, palette, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Today",
    ageLine: (age) => age,
    chapterTitle: (month) => `${month} chapter`,
    chapterBody: (count, name) => count > 0
      ? `${count} ${count === 1 ? "moment" : "moments"} from ${name} can become this month’s story.`
      : `Save a few moments and turn ${name}'s month into a story.`,
    chapterCta: "Make this month’s story",
    returnTitle: "Worth coming back to",
    fromThisDay: "From this day",
    favorite: "Worth keeping",
    latest: "Latest saved moment",
    yearsAgo: (years) => `${years} year${years === 1 ? "" : "s"} ago today`,
    emptyReturn: "The memories you save now will come back here later, when they feel different.",
    draftTitle: "Finish the almost-memory",
    draftBody: "You started saving something. Finish it before the details fade.",
    draftCta: "Continue",
    queuedTitle: "Waiting for connection",
    queuedBody: (count) => `${count} offline ${count === 1 ? "memory" : "memories"} will upload when connection returns.`,
    totalMemories: "memories saved",
    thisWeek: "this week",
    noWeek: "none this week yet",
  },
  pt: {
    today: "Hoje",
    ageLine: (age) => age,
    chapterTitle: (month) => `Capítulo de ${month}`,
    chapterBody: (count, name) => count > 0
      ? `${count} ${count === 1 ? "momento" : "momentos"} de ${name} podem tornar-se na história deste mês.`
      : `Guarda alguns momentos e transforma o mês de ${name} numa história.`,
    chapterCta: "Criar história deste mês",
    returnTitle: "Para voltar mais tarde",
    fromThisDay: "Deste dia",
    favorite: "Vale a pena guardar",
    latest: "Último momento guardado",
    yearsAgo: (years) => `Há ${years} ano${years === 1 ? "" : "s"} neste dia`,
    emptyReturn: "As memórias que guardas agora vão voltar aqui mais tarde, quando souberem diferente.",
    draftTitle: "Termina a quase-memória",
    draftBody: "Começaste a guardar algo. Termina antes que os detalhes desapareçam.",
    draftCta: "Continuar",
    queuedTitle: "À espera de ligação",
    queuedBody: (count) => `${count} ${count === 1 ? "memória offline" : "memórias offline"} vai carregar quando a ligação voltar.`,
    totalMemories: "memórias guardadas",
    thisWeek: "esta semana",
    noWeek: "ainda nenhuma esta semana",
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

const monthName = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  month: "long",
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

export default function HomeRitualScreen() {
  const [open, setOpen] = useState(true);
  const { user, profiles, entries, draft, queuedCount, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: true, entryLimit: 160 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profile = profiles[0];
  const today = todayIso();
  const weekStart = startOfWeek();
  const period = monthBounds();

  useEffect(() => {
    const show = () => { setOpen(true); refresh(); };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-today", show);
    window.addEventListener("zommy:hide-today", hide);
    return () => {
      window.removeEventListener("zommy:show-today", show);
      window.removeEventListener("zommy:hide-today", hide);
    };
  }, [refresh]);

  if (!open || !user || !profile) return null;

  const childEntries = entries.filter((entry) => entry.profile_id === profile.id);
  const monthEntries = childEntries.filter((entry) => entry.date >= period.start && entry.date <= period.end);
  const weeklyCount = childEntries.filter((entry) => entry.date >= weekStart).length;
  const latest = childEntries[0];
  const favorite = childEntries.find((entry) => entry.favorite);
  const anniversary = childEntries.find((entry) => sameMonthDay(entry.date, today) && yearsBetween(entry.date, today) > 0);
  const returnEntry = anniversary || favorite || latest;

  const openChapter = () => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: profile.id } }));
  const openDraft = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { restoreDraft: true } }));

  const returnLabel = anniversary ? copy.fromThisDay : favorite ? copy.favorite : copy.latest;
  const returnTitle = anniversary ? copy.yearsAgo(yearsBetween(anniversary.date, today)) : returnEntry ? formatDate(returnEntry.date, lang) : copy.returnTitle;

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame()}>
        <header style={{ display: "grid", gap: 15 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ ...label, color: profile.color || palette.clay }}>{copy.today}</div>
              <h1 style={{ fontFamily: type.serif, fontSize: 40, lineHeight: 1.02, fontWeight: 650, marginTop: 5 }}>{profile.name}</h1>
              <p style={{ color: palette.inkMuted, marginTop: 6, fontSize: 14 }}>{copy.ageLine(childAge(profile.birthdate, lang))}</p>
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 22, background: `linear-gradient(145deg, ${profile.color || palette.sage}22, rgba(255,253,248,.86))`, color: profile.color || "#34D399", display: "grid", placeItems: "center", fontSize: 34, boxShadow: palette.shadowSoft }}>{profile.emoji || "👶"}</div>
          </div>
        </header>

        {(draft || queuedCount > 0) && (
          <section style={{ display: "grid", gap: 10 }}>
            {draft && <StatusCard title={copy.draftTitle} body={copy.draftBody} cta={copy.draftCta} onClick={openDraft} tone="#FBBF24" />}
            {queuedCount > 0 && <StatusCard title={copy.queuedTitle} body={copy.queuedBody(queuedCount)} tone="#60A5FA" />}
          </section>
        )}

        <section className="zommy-elevated-card" style={{ ...card, border: `1px solid ${(profile.color || palette.sage)}44`, padding: 18, background: `linear-gradient(145deg, ${(profile.color || palette.sage)}18, rgba(255,253,248,0.84))`, display: "grid", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
            <div>
              <h2 style={{ fontFamily: type.serif, fontSize: 27, lineHeight: 1.08, fontWeight: 650 }}>{copy.chapterTitle(monthName(period.start, lang))}</h2>
              <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14, marginTop: 6 }}>{copy.chapterBody(monthEntries.length, profile.name)}</p>
            </div>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(255,248,239,0.9)", display: "grid", placeItems: "center", fontSize: 28 }}>✍️</div>
          </div>
          <button onClick={openChapter} style={{ justifySelf: "start", border: "none", background: profile.color || "#34D399", color: palette.ink, borderRadius: 999, padding: "11px 14px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>{copy.chapterCta}</button>
        </section>

        <section className="zommy-elevated-card" style={{ ...card, overflow: "hidden" }}>
          {returnEntry?.photoUrl ? (
            <img src={returnEntry.photoUrl} alt={`${profile.name} memory`} style={{ width: "100%", height: 250, objectFit: "cover", objectPosition: returnEntry.cover_position || "50% 50%", display: "block" }} />
          ) : (
            <div style={{ height: 190, display: "grid", placeItems: "center", color: palette.inkFaint, fontSize: 42, background: "rgba(255,248,239,0.74)" }}>{profile.emoji || "📷"}</div>
          )}
          <div style={{ padding: 16, display: "grid", gap: 8 }}>
            <div style={{ color: anniversary ? "#A78BFA" : favorite ? palette.honey : palette.inkFaint, fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{returnLabel}</div>
            <h2 style={{ fontFamily: type.serif, fontSize: 23, lineHeight: 1.2, fontWeight: 650 }}>{returnTitle}</h2>
            {returnEntry?.note ? <p style={{ color: palette.inkMuted, lineHeight: 1.58, fontSize: 14 }}>{returnEntry.note}</p> : <p style={{ color: palette.inkMuted, lineHeight: 1.58, fontSize: 14 }}>{copy.emptyReturn}</p>}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MetricCard value={childEntries.length} label={copy.totalMemories} />
          <MetricCard value={weeklyCount} label={weeklyCount ? copy.thisWeek : copy.noWeek} />
        </section>

        {loading && <div style={{ color: palette.inkFaint, textAlign: "center", padding: 18 }}>Loading…</div>}
      </div>
    </main>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="zommy-elevated-card" style={{ ...card, borderRadius: 20, padding: 14, minHeight: 82, display: "grid", alignContent: "center", gap: 4 }}>
      <div style={{ fontSize: 25, fontWeight: 950 }}>{value}</div>
      <div style={{ color: palette.inkMuted, fontSize: 12 }}>{label}</div>
    </div>
  );
}

function StatusCard({ title, body, cta, onClick, tone = "#34D399" }) {
  const content = (
    <>
      <div style={{ color: tone, fontSize: 13, fontWeight: 950 }}>{title}</div>
      <p style={{ color: palette.inkMuted, fontSize: 13, lineHeight: 1.5 }}>{body}</p>
      {cta && <div style={{ justifySelf: "start", background: tone, color: palette.ink, borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 950 }}>{cta}</div>}
    </>
  );

  if (onClick) {
    return <button className="zommy-elevated-card" onClick={onClick} style={{ width: "100%", textAlign: "left", border: `1px solid ${tone}55`, background: `linear-gradient(145deg, ${tone}16, rgba(255,253,248,.80))`, borderRadius: 18, padding: 14, display: "grid", gap: 7, cursor: "pointer" }}>{content}</button>;
  }

  return (
    <article className="zommy-elevated-card" style={{ border: `1px solid ${tone}55`, background: `linear-gradient(145deg, ${tone}16, rgba(255,253,248,.80))`, borderRadius: 18, padding: 14, display: "grid", gap: 7 }}>
      {content}
    </article>
  );
}
