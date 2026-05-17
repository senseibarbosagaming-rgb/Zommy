import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { monthBounds } from "./capsuleCore";
import { appSurface, card, contentFrame, emptyStateCard, label, palette, primaryButton, secondaryButton, softCard, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Today",
    private: "Private to your family",
    prompt: "Whatâ€™s one tiny thing you donâ€™t want to forget today?",
    addMoment: "Add photo or note",
    latest: "Latest saved memory",
    returnTitle: "Worth coming back to",
    fromThisDay: "From this day",
    favorite: "Worth keeping",
    compare: "Suggested comparison",
    compareBody: "Place the earliest and latest moments side by side and feel the time between them.",
    compareCta: "Compare then and now",
    chapterTitle: (month) => `${month} chapter`,
    chapterBody: (count, name) => count > 0 ? `${count} ${count === 1 ? "moment" : "moments"} can become ${name}â€™s month story.` : `A few small memories will turn ${name}â€™s month into a story.`,
    chapterCta: "Open month story",
    emptyHeadline: "Start with today.",
    emptyBody: "One photo. One sentence. Thatâ€™s enough.",
    emptyCta: "Add first memory",
    draftTitle: "Finish the almost-memory",
    draftBody: "You started saving something. Finish it before the details fade.",
    draftCta: "Continue",
    queuedTitle: "Waiting for connection",
    queuedBody: (count) => `${count} offline ${count === 1 ? "memory" : "memories"} will upload when connection returns.`,
  },
  pt: {
    today: "Hoje",
    private: "Privado para a tua famÃ­lia",
    prompt: "Qual Ã© uma coisa pequenina que nÃ£o queres esquecer hoje?",
    addMoment: "Adicionar foto ou nota",
    latest: "Ãšltima memÃ³ria guardada",
    returnTitle: "Para voltar mais tarde",
    fromThisDay: "Deste dia",
    favorite: "Vale a pena guardar",
    compare: "ComparaÃ§Ã£o sugerida",
    compareBody: "Coloca o primeiro e o Ãºltimo momento lado a lado e sente o tempo entre eles.",
    compareCta: "Comparar antes e agora",
    chapterTitle: (month) => `CapÃ­tulo de ${month}`,
    chapterBody: (count, name) => count > 0 ? `${count} ${count === 1 ? "momento" : "momentos"} podem tornar-se na histÃ³ria do mÃªs de ${name}.` : `Algumas memÃ³rias pequenas vÃ£o transformar o mÃªs de ${name} numa histÃ³ria.`,
    chapterCta: "Abrir histÃ³ria do mÃªs",
    emptyHeadline: "ComeÃ§a por hoje.",
    emptyBody: "Uma foto. Uma frase. Ã‰ suficiente.",
    emptyCta: "Adicionar primeira memÃ³ria",
    draftTitle: "Termina a quase-memÃ³ria",
    draftBody: "ComeÃ§aste a guardar algo. Termina antes que os detalhes desapareÃ§am.",
    draftCta: "Continuar",
    queuedTitle: "Ã€ espera de ligaÃ§Ã£o",
    queuedBody: (count) => `${count} ${count === 1 ? "memÃ³ria offline" : "memÃ³rias offline"} vai carregar quando a ligaÃ§Ã£o voltar.`,
  },
};

const getPrefs = () => { try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); } catch { return {}; } };
const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const todayIso = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); };
const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
const monthName = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { month: "long" });
const diffDays = (from, to) => Math.floor((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
const childAge = (birthdate, lang) => {
  if (!birthdate) return "";
  const days = Math.max(0, diffDays(birthdate, todayIso()));
  const totalMonths = Math.floor(days / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (lang === "pt") return years <= 0 ? `${Math.max(0, totalMonths)} mes${totalMonths === 1 ? "" : "es"}` : `${years} ano${years === 1 ? "" : "s"}${months ? ` e ${months} mes${months === 1 ? "" : "es"}` : ""}`;
  return years <= 0 ? `${Math.max(0, totalMonths)} month${totalMonths === 1 ? "" : "s"}` : `${years} year${years === 1 ? "" : "s"}${months ? `, ${months} month${months === 1 ? "" : "s"}` : ""}`;
};
const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);
const yearsBetween = (from, to) => parseInt(to.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);

export default function HomeRitualScreen() {
  const [open, setOpen] = useState(true);
  const { activeProfileId, setActiveProfileId, openPrimaryScreen } = useAppShell();
  const { user, profiles, entries, draft, queuedCount, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: true, entryLimit: 160 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
  const period = monthBounds();
  const today = todayIso();

  useEffect(() => {
    const show = (event) => { setOpen(true); if (event.detail?.profileId) setActiveProfileId(event.detail.profileId); refresh(); };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-today", show);
    window.addEventListener("zommy:hide-today", hide);
    return () => { window.removeEventListener("zommy:show-today", show); window.removeEventListener("zommy:hide-today", hide); };
  }, [refresh, setActiveProfileId]);

  if (!open || !user || !profile) return null;

  const tone = profile.color || palette.clay;
  const childEntries = entries.filter((entry) => entry.profile_id === profile.id);
  const monthEntries = childEntries.filter((entry) => entry.date >= period.start && entry.date <= period.end);
  const latest = childEntries[0];
  const favorite = childEntries.find((entry) => entry.favorite);
  const anniversary = childEntries.find((entry) => sameMonthDay(entry.date, today) && yearsBetween(entry.date, today) > 0);
  const returnEntry = anniversary || favorite || childEntries[1] || latest;
  const earliest = childEntries[childEntries.length - 1];

  const openComposer = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile.id, restoreDraft: false } }));
  const openDraft = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { restoreDraft: true } }));
  const openChapter = () => window.dispatchEvent(new CustomEvent("zommy:show-chapter", { detail: { profileId: profile.id } }));

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame()}>
        <header style={{ ...softCard({ padding: 18, overflow: "hidden", background: palette.surface }), position: "relative" }}>
          <div style={{ position: "absolute", right: -28, top: -22, width: 130, height: 130, borderRadius: "50%", background: `${tone}18` }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, position: "relative" }}>
            <div>
              <div style={{ ...label, color: tone }}>{copy.today}</div>
              <h1 style={{ fontFamily: type.serif, fontSize: 39, lineHeight: 1.02, fontWeight: type.weight.heading, marginTop: 5 }}>{profile.name}</h1>
              <p style={{ color: palette.inkMuted, marginTop: 6, fontSize: 14 }}>{childAge(profile.birthdate, lang)}</p>
            </div>
            <div style={{ width: 66, height: 66, borderRadius: 24, background: profile.bg || palette.accentSoft, color: tone, display: "grid", placeItems: "center", fontSize: 34, boxShadow: palette.shadow }}>{profile.emoji || "â—Œ"}</div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 16, color: palette.deep, background: "rgba(255,253,248,.64)", border: `1px solid ${palette.border}`, borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: type.weight.ui }}>â— {copy.private}</div>
        </header>

        {(draft || queuedCount > 0) && <section style={{ display: "grid", gap: 10 }}>{draft && <StatusCard title={copy.draftTitle} body={copy.draftBody} cta={copy.draftCta} onClick={openDraft} tone={palette.honey} />}{queuedCount > 0 && <StatusCard title={copy.queuedTitle} body={copy.queuedBody(queuedCount)} tone={palette.softBlue} />}</section>}

        <section style={{ ...softCard({ display: "grid", gap: 14 }) }}>
          <h2 style={{ fontFamily: type.serif, fontSize: 26, lineHeight: 1.15, fontWeight: type.weight.heading }}>{copy.prompt}</h2>
          <button className="b" onClick={openComposer} style={{ ...primaryButton(tone), justifySelf: "start" }}>{copy.addMoment}</button>
        </section>

        {!childEntries.length && <EmptyStart copy={copy} onClick={openComposer} />}
        {latest && <MemoryFeature label={copy.latest} entry={latest} profile={profile} lang={lang} />}
        {returnEntry && <MemoryFeature label={anniversary ? copy.fromThisDay : favorite ? copy.favorite : copy.returnTitle} entry={returnEntry} profile={profile} lang={lang} quiet />}

        {childEntries.length >= 2 && earliest?.id !== latest?.id && (
          <section style={{ ...softCard({ display: "grid", gap: 12, borderColor: `${palette.deep}30` }) }}>
            <div style={{ ...label, color: palette.deep }}>{copy.compare}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><MiniPhoto entry={earliest} profile={profile} /><MiniPhoto entry={latest} profile={profile} /></div>
            <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.compareBody}</p>
            <button className="b" onClick={() => openPrimaryScreen("compare", { profileId: profile.id })} style={{ ...secondaryButton(palette.deep), justifySelf: "start" }}>{copy.compareCta}</button>
          </section>
        )}

            <section className="zommy-elevated-card" style={{ ...card, padding: 18, background: palette.surface, display: "grid", gap: 12 }}>
          <div style={{ ...label, color: tone }}>Monthly story</div>
          <h2 style={{ fontFamily: type.serif, fontSize: 27, lineHeight: 1.08, fontWeight: type.weight.heading }}>{copy.chapterTitle(monthName(period.start, lang))}</h2>
          <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.chapterBody(monthEntries.length, profile.name)}</p>
          <button className="b" onClick={openChapter} style={{ ...secondaryButton(tone), justifySelf: "start" }}>{copy.chapterCta}</button>
        </section>

        {loading && <SkeletonCard />}
      </div>
    </main>
  );
}

function EmptyStart({ copy, onClick }) { return <section style={emptyStateCard}><h2 style={{ fontFamily: type.serif, fontSize: 27, lineHeight: 1.12 }}>{copy.emptyHeadline}</h2><p style={{ color: palette.inkMuted, lineHeight: 1.55 }}>{copy.emptyBody}</p><button className="b" onClick={onClick} style={{ ...primaryButton(), justifySelf: "center" }}>{copy.emptyCta}</button></section>; }
function MiniPhoto({ entry, profile }) { return <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "1 / 1.18", background: palette.paperSoft }}>{entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} memory`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 28 }}>{profile.emoji || "â—Œ"}</div>}</div>; }
function MemoryFeature({ label: title, entry, profile, lang, quiet = false }) { return <article className="zommy-elevated-card" style={{ ...card, overflow: "hidden" }}>{entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} memory from ${entry.date}`} style={{ width: "100%", height: quiet ? 196 : 252, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} /> : <div style={{ height: quiet ? 156 : 190, display: "grid", placeItems: "center", color: palette.inkFaint, fontSize: 42, background: palette.paperSoft }}>{profile.emoji || "ðŸ“·"}</div>}<div style={{ padding: 16, display: "grid", gap: 8 }}><div style={{ ...label, color: quiet ? palette.sage : profile.color || palette.clay }}>{title}</div><h2 style={{ fontFamily: type.serif, fontSize: 23, lineHeight: 1.2, fontWeight: type.weight.heading }}>{formatDate(entry.date, lang)}</h2>{entry.note && <p style={{ color: palette.inkMuted, lineHeight: 1.62, fontSize: 14 }}>{entry.note}</p>}</div></article>; }
function StatusCard({ title, body, cta, onClick, tone }) { const content = <><div style={{ color: tone, fontSize: 13, fontWeight: type.weight.heading }}>{title}</div><p style={{ color: palette.inkMuted, fontSize: 13, lineHeight: 1.5 }}>{body}</p>{cta && <div style={{ justifySelf: "start", ...secondaryButton(tone), padding: "8px 11px", fontSize: 12 }}>{cta}</div>}</>; return onClick ? <button className="zommy-elevated-card" onClick={onClick} style={{ textAlign: "left", ...softCard({ background: palette.surface, display: "grid", gap: 7, cursor: "pointer" }) }}>{content}</button> : <article className="zommy-elevated-card" style={{ ...softCard({ background: palette.surface, display: "grid", gap: 7 }) }}>{content}</article>; }
function SkeletonCard() { return <div aria-hidden="true" style={{ ...card, height: 180, background: palette.surface }} />; }

