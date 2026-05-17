import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { appSurface, card, contentFrame, emptyStateCard, label, palette, primaryButton, secondaryButton, softCard, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Compare",
    subtitle: "Time, held gently side by side.",
    emptyHeadline: "Watch them change.",
    emptyBody: "Pick two moments and place them side by side. Newborn and today. First steps and now. Same sofa, different month.",
    emptyCta: "Create first comparison",
    suggested: "Suggested for you",
    manual: "Build your own",
    saved: "Saved comparisons",
    noSaved: "Saved then-and-now moments will live here.",
    then: "Then",
    now: "Now",
    firstLatest: "First time / latest time",
    samePlace: "Same place, different month",
    newborn: "Newborn vs today",
    note: "Add note",
    share: "Share with family",
    save: "Save to timeline",
    private: "Only invited family members can see this",
    addMore: "Add more memories to unlock richer comparisons.",
  },
  pt: {
    title: "Comparar",
    subtitle: "O tempo, lado a lado com calma.",
    emptyHeadline: "VÃª como mudam.",
    emptyBody: "Escolhe dois momentos e coloca-os lado a lado. RecÃ©m-nascido e hoje. Primeiros passos e agora. O mesmo sofÃ¡, outro mÃªs.",
    emptyCta: "Criar primeira comparaÃ§Ã£o",
    suggested: "SugestÃµes para ti",
    manual: "Criar comparaÃ§Ã£o",
    saved: "ComparaÃ§Ãµes guardadas",
    noSaved: "Os momentos antes-e-agora guardados vÃ£o viver aqui.",
    then: "Antes",
    now: "Agora",
    firstLatest: "Primeira vez / Ãºltima vez",
    samePlace: "Mesmo lugar, outro mÃªs",
    newborn: "RecÃ©m-nascido e hoje",
    note: "Adicionar nota",
    share: "Partilhar com famÃ­lia",
    save: "Guardar na timeline",
    private: "SÃ³ familiares convidados podem ver isto",
    addMore: "Adiciona mais memÃ³rias para desbloquear comparaÃ§Ãµes mais ricas.",
  },
};
const getPrefs = () => { try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); } catch { return {}; } };
const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
const ageAt = (birthdate, date, lang) => {
  if (!birthdate || !date) return "";
  const days = Math.max(0, Math.floor((new Date(`${date}T12:00:00`) - new Date(`${birthdate}T12:00:00`)) / 86400000));
  if (days < 31) return lang === "pt" ? `${days} dias` : `${days} days`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return lang === "pt" ? `${months} meses` : `${months} months`;
  const years = Math.floor(months / 12);
  return lang === "pt" ? `${years} anos` : `${years} years`;
};

export default function CompareScreen() {
  const [open, setOpen] = useState(false);
  const { activeProfileId, setActiveProfileId } = useAppShell();
  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 500 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";

  useEffect(() => {
    const show = (event) => { if (event.detail?.profileId) setActiveProfileId(event.detail.profileId); setOpen(true); refresh(); };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-compare", show);
    window.addEventListener("zommy:hide-compare", hide);
    return () => { window.removeEventListener("zommy:show-compare", show); window.removeEventListener("zommy:hide-compare", hide); };
  }, [refresh, setActiveProfileId]);

  if (!open || !user) return null;
  const profile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
  const profileEntries = profile ? entries.filter((entry) => entry.profile_id === profile.id) : [];
  const latest = profileEntries[0];
  const earliest = profileEntries[profileEntries.length - 1];
  const second = profileEntries.find((entry) => entry.id !== latest?.id);
  const tone = profile?.color || palette.deep;
  const hasPair = earliest && latest && earliest.id !== latest.id;
  const openComposer = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile?.id || "", restoreDraft: false } }));

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame(124)}>
        <header style={{ ...softCard({ borderColor: `${palette.deep}30`, background: "rgba(255,253,248,.88)" }) }}>
          <div style={{ ...label, color: palette.deep }}>{profile?.name || copy.title}</div>
          <h1 style={{ fontFamily: type.serif, fontSize: 34, lineHeight: 1.06, fontWeight: type.weight.heading, marginTop: 5 }}>{copy.title}</h1>
          <p style={{ color: palette.inkMuted, lineHeight: 1.55, marginTop: 6 }}>{copy.subtitle}</p>
          <div style={{ display: "inline-flex", marginTop: 12, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "7px 10px", color: palette.inkMuted, fontSize: 12, fontWeight: type.weight.ui }}>â— {copy.private}</div>
        </header>

        {!profile || profileEntries.length < 2 ? (
          <>
            <section style={emptyStateCard}>
              <h2 style={{ fontFamily: type.serif, fontSize: 29, lineHeight: 1.1 }}>{copy.emptyHeadline}</h2>
              <p style={{ color: palette.inkMuted, lineHeight: 1.6 }}>{copy.emptyBody}</p>
              <button className="b" onClick={openComposer} style={{ ...primaryButton(tone), justifySelf: "center" }}>{copy.emptyCta}</button>
            </section>
            <section style={{ display: "grid", gap: 10 }}>
              <PreviewCard title="Then / Now" />
              <PreviewCard title={copy.firstLatest} tone={palette.sage} />
              <PreviewCard title={copy.samePlace} tone={palette.honey} />
            </section>
          </>
        ) : (
          <>
            <section style={{ display: "grid", gap: 10 }}>
              <div style={{ ...label, color: palette.deep }}>{copy.suggested}</div>
              <CompareCard title={copy.newborn} left={earliest} right={latest} profile={profile} lang={lang} copy={copy} />
              {second && <CompareCard title={copy.firstLatest} left={second} right={latest} profile={profile} lang={lang} copy={copy} />}
            </section>
            <section style={{ ...softCard({ display: "grid", gap: 10 }) }}>
              <div style={{ ...label, color: tone }}>{copy.manual}</div>
              <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.addMore}</p>
              <button className="b" onClick={openComposer} style={{ ...secondaryButton(tone), justifySelf: "start" }}>{copy.emptyCta}</button>
            </section>
            <section style={{ ...softCard({ display: "grid", gap: 8 }) }}>
              <div style={{ ...label, color: palette.inkFaint }}>{copy.saved}</div>
              <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.noSaved}</p>
            </section>
          </>
        )}
        {loading && <div style={{ color: palette.inkFaint, textAlign: "center", padding: 12 }}>Loadingâ€¦</div>}
      </div>
    </main>
  );
}

function CompareCard({ title, left, right, profile, lang, copy }) {
  return (
    <article className="zommy-elevated-card" style={{ ...card, overflow: "hidden" }}>
      <div style={{ padding: 15, display: "grid", gap: 12 }}>
        <h2 style={{ fontFamily: type.serif, fontSize: 25, lineHeight: 1.12, fontWeight: type.weight.heading }}>{title}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MomentTile label={copy.then} entry={left} profile={profile} lang={lang} />
          <MomentTile label={copy.now} entry={right} profile={profile} lang={lang} />
        </div>
        <p style={{ color: palette.inkMuted, fontSize: 14, lineHeight: 1.55 }}>From {formatDate(left.date, lang)} to {formatDate(right.date, lang)} â€” the same story, further along.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={secondaryButton(palette.deep)}>{copy.save}</button>
          <button style={secondaryButton(profile.color || palette.sage)}>{copy.share}</button>
          <button style={secondaryButton(palette.clay)}>{copy.note}</button>
        </div>
      </div>
    </article>
  );
}
function MomentTile({ label: tileLabel, entry, profile, lang }) { return <div style={{ border: `1px solid ${palette.border}`, borderRadius: 22, overflow: "hidden", background: palette.paperSoft }}><div style={{ aspectRatio: "1 / 1.15" }}>{entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} ${tileLabel.toLowerCase()} memory`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 32 }}>{profile.emoji || "â—Œ"}</div>}</div><div style={{ padding: 10, display: "grid", gap: 3 }}><div style={{ ...label, color: profile.color || palette.clay, fontSize: 10 }}>{tileLabel}</div><div style={{ color: palette.ink, fontSize: 12, fontWeight: type.weight.ui }}>{formatDate(entry.date, lang)}</div><div style={{ color: palette.inkMuted, fontSize: 11 }}>{ageAt(profile.birthdate, entry.date, lang)}</div></div></div>; }
function PreviewCard({ title, tone = palette.clay }) { return <article style={{ ...softCard({ background: palette.surface }), display: "grid", gap: 10 }}><h3 style={{ fontFamily: type.serif, fontSize: 23, fontWeight: type.weight.heading }}>{title}</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div style={{ height: 116, borderRadius: 20, background: `${tone}1f` }} /><div style={{ height: 116, borderRadius: 20, background: palette.wash }} /></div></article>; }

