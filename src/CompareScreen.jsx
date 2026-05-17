import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { appSurface, card, contentFrame, emptyStateCard, field, label, palette, primaryButton, secondaryButton, softCard, type } from "./designSystem";
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
    save: "Save comparison",
    savedAction: "Saved",
    notePrompt: "What do you want to remember about the time between these two moments?",
    private: "Only invited family members can see this",
    addMore: "Choose two memories, or add another moment if today deserves to be part of the pair.",
    firstMoment: "First moment",
    secondMoment: "Second moment",
    preview: "Preview comparison",
  },
  pt: {
    title: "Comparar",
    subtitle: "O tempo, lado a lado com calma.",
    emptyHeadline: "Vê como mudam.",
    emptyBody: "Escolhe dois momentos e coloca-os lado a lado. Recém-nascido e hoje. Primeiros passos e agora. O mesmo sofá, outro mês.",
    emptyCta: "Criar primeira comparação",
    suggested: "Sugestões para ti",
    manual: "Criar comparação",
    saved: "Comparações guardadas",
    noSaved: "As comparações antes-e-agora guardadas vão viver aqui.",
    then: "Antes",
    now: "Agora",
    firstLatest: "Primeira vez / última vez",
    samePlace: "Mesmo lugar, outro mês",
    newborn: "Recém-nascido e hoje",
    note: "Adicionar nota",
    share: "Partilhar com família",
    save: "Guardar comparação",
    savedAction: "Guardada",
    notePrompt: "O que queres lembrar sobre o tempo entre estes dois momentos?",
    private: "Só familiares convidados podem ver isto",
    addMore: "Escolhe duas memórias, ou adiciona outro momento se hoje merece fazer parte do par.",
    firstMoment: "Primeiro momento",
    secondMoment: "Segundo momento",
    preview: "Pré-visualizar comparação",
  },
};

const STORAGE_KEY = "zommy_saved_comparisons_v1";
const getPrefs = () => { try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); } catch { return {}; } };
const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const comparisonId = (profileId, leftId, rightId) => `${profileId}:${leftId}:${rightId}`;
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const persistSaved = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
  const [savedComparisons, setSavedComparisons] = useState(loadSaved);
  const [manualLeftId, setManualLeftId] = useState("");
  const [manualRightId, setManualRightId] = useState("");
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
  const entryById = Object.fromEntries(profileEntries.map((entry) => [entry.id, entry]));
  const latest = profileEntries[0];
  const earliest = profileEntries[profileEntries.length - 1];
  const second = profileEntries.find((entry) => entry.id !== latest?.id);
  const tone = profile?.color || palette.deep;
  const manualLeft = entryById[manualLeftId] || earliest;
  const manualRight = entryById[manualRightId] || latest;
  const profileSaved = savedComparisons.filter((item) => item.profileId === profile?.id).map((item) => ({ ...item, left: entryById[item.leftId], right: entryById[item.rightId] })).filter((item) => item.left && item.right);
  const openComposer = () => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile?.id || "", restoreDraft: false } }));
  const shareWithFamily = () => window.dispatchEvent(new CustomEvent("zommy:show-family-sharing", { detail: { profileId: profile?.id || "" } }));
  const saveComparison = (title, left, right, note = "") => {
    if (!profile || !left || !right || left.id === right.id) return;
    const id = comparisonId(profile.id, left.id, right.id);
    const next = [
      { id, profileId: profile.id, leftId: left.id, rightId: right.id, title, note, savedAt: new Date().toISOString() },
      ...savedComparisons.filter((item) => item.id !== id),
    ];
    setSavedComparisons(next);
    persistSaved(next);
  };
  const addNote = (title, left, right) => {
    const note = window.prompt(copy.notePrompt, "");
    if (note !== null) saveComparison(title, left, right, note.trim());
  };

  return (
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame(124)}>
        <header style={{ ...softCard({ borderColor: `${palette.deep}30`, background: "rgba(255,253,248,.88)" }) }}>
          <div style={{ ...label, color: palette.deep }}>{profile?.name || copy.title}</div>
          <h1 style={{ fontFamily: type.serif, fontSize: 34, lineHeight: 1.06, fontWeight: 650, marginTop: 5 }}>{copy.title}</h1>
          <p style={{ color: palette.inkMuted, lineHeight: 1.55, marginTop: 6 }}>{copy.subtitle}</p>
          <div style={{ display: "inline-flex", marginTop: 12, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "7px 10px", color: palette.inkMuted, fontSize: 12, fontWeight: 850 }}>● {copy.private}</div>
        </header>

        {!profile || profileEntries.length < 2 ? (
          <>
            <section style={emptyStateCard}>
              <h2 style={{ fontFamily: type.serif, fontSize: 29, lineHeight: 1.1 }}>{copy.emptyHeadline}</h2>
              <p style={{ color: palette.inkMuted, lineHeight: 1.6 }}>{copy.emptyBody}</p>
              <button type="button" className="b" onClick={openComposer} style={{ ...primaryButton(tone), justifySelf: "center" }}>{copy.emptyCta}</button>
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
              <CompareCard title={copy.newborn} left={earliest} right={latest} profile={profile} lang={lang} copy={copy} saved={savedComparisons.some((item) => item.id === comparisonId(profile.id, earliest.id, latest.id))} onSave={saveComparison} onShare={shareWithFamily} onNote={addNote} />
              {second && <CompareCard title={copy.firstLatest} left={second} right={latest} profile={profile} lang={lang} copy={copy} saved={savedComparisons.some((item) => item.id === comparisonId(profile.id, second.id, latest.id))} onSave={saveComparison} onShare={shareWithFamily} onNote={addNote} />}
            </section>

            <section style={{ ...softCard({ display: "grid", gap: 10 }) }}>
              <div style={{ ...label, color: tone }}>{copy.manual}</div>
              <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.addMore}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <SelectMemory label={copy.firstMoment} value={manualLeft?.id || ""} entries={profileEntries} lang={lang} onChange={setManualLeftId} />
                <SelectMemory label={copy.secondMoment} value={manualRight?.id || ""} entries={profileEntries} lang={lang} onChange={setManualRightId} />
              </div>
              {manualLeft && manualRight && manualLeft.id !== manualRight.id ? <CompareCard title={copy.preview} left={manualLeft} right={manualRight} profile={profile} lang={lang} copy={copy} saved={savedComparisons.some((item) => item.id === comparisonId(profile.id, manualLeft.id, manualRight.id))} onSave={saveComparison} onShare={shareWithFamily} onNote={addNote} compact /> : <button type="button" className="b" onClick={openComposer} style={{ ...secondaryButton(tone), justifySelf: "start" }}>{copy.emptyCta}</button>}
            </section>

            <section style={{ ...softCard({ display: "grid", gap: 10 }) }}>
              <div style={{ ...label, color: palette.inkFaint }}>{copy.saved}</div>
              {profileSaved.length ? profileSaved.map((item) => <CompareCard key={item.id} title={item.title} left={item.left} right={item.right} profile={profile} lang={lang} copy={copy} saved note={item.note} onSave={saveComparison} onShare={shareWithFamily} onNote={addNote} compact />) : <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.noSaved}</p>}
            </section>
          </>
        )}
        {loading && <div style={{ color: palette.inkFaint, textAlign: "center", padding: 12 }}>Loading…</div>}
      </div>
    </main>
  );
}

function CompareCard({ title, left, right, profile, lang, copy, saved = false, note = "", compact = false, onSave, onShare, onNote }) {
  return (
    <article className="zommy-elevated-card" style={{ ...card, overflow: "hidden", boxShadow: compact ? palette.shadowLift : palette.shadowSoft }}>
      <div style={{ padding: compact ? 13 : 15, display: "grid", gap: 12 }}>
        <h2 style={{ fontFamily: type.serif, fontSize: compact ? 22 : 25, lineHeight: 1.12, fontWeight: 650 }}>{title}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MomentTile label={copy.then} entry={left} profile={profile} lang={lang} />
          <MomentTile label={copy.now} entry={right} profile={profile} lang={lang} />
        </div>
        <p style={{ color: palette.inkMuted, fontSize: 14, lineHeight: 1.55 }}>From {formatDate(left.date, lang)} to {formatDate(right.date, lang)} — the same story, further along.</p>
        {note && <p style={{ borderLeft: `3px solid ${profile.color || palette.clay}`, paddingLeft: 10, color: palette.ink, fontFamily: type.serif, fontSize: 15, lineHeight: 1.55 }}>{note}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="b" onClick={() => onSave?.(title, left, right)} disabled={saved} style={{ ...secondaryButton(saved ? palette.sage : palette.deep), opacity: saved ? 0.72 : 1 }}>{saved ? copy.savedAction : copy.save}</button>
          <button type="button" className="b" onClick={onShare} style={secondaryButton(profile.color || palette.sage)}>{copy.share}</button>
          <button type="button" className="b" onClick={() => onNote?.(title, left, right)} style={secondaryButton(palette.clay)}>{copy.note}</button>
        </div>
      </div>
    </article>
  );
}

function SelectMemory({ label: selectLabel, value, entries, lang, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, ...label, color: palette.inkMuted }}>
      {selectLabel}
      <select value={value} onChange={(event) => onChange(event.target.value)} style={field}>
        {entries.map((entry) => <option key={entry.id} value={entry.id}>{formatDate(entry.date, lang)}{entry.note ? ` · ${entry.note.slice(0, 24)}` : ""}</option>)}
      </select>
    </label>
  );
}

function MomentTile({ label: tileLabel, entry, profile, lang }) {
  return <div style={{ border: `1px solid ${palette.border}`, borderRadius: 22, overflow: "hidden", background: palette.paperSoft }}><div style={{ aspectRatio: "1 / 1.15" }}>{entry.photoUrl ? <img src={entry.photoUrl} alt={`${profile.name} ${tileLabel.toLowerCase()} memory`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: entry.cover_position || "50% 50%" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 32 }}>{profile.emoji || "◌"}</div>}</div><div style={{ padding: 10, display: "grid", gap: 3 }}><div style={{ ...label, color: profile.color || palette.clay, fontSize: 10 }}>{tileLabel}</div><div style={{ color: palette.ink, fontSize: 12, fontWeight: 850 }}>{formatDate(entry.date, lang)}</div><div style={{ color: palette.inkMuted, fontSize: 11 }}>{ageAt(profile.birthdate, entry.date, lang)}</div></div></div>;
}

function PreviewCard({ title, tone = palette.clay }) {
  return <article style={{ ...softCard({ borderColor: `${tone}35`, background: `linear-gradient(135deg, ${tone}18, rgba(255,253,248,.88))` }), display: "grid", gap: 10 }}><h3 style={{ fontFamily: type.serif, fontSize: 23, fontWeight: 650 }}>{title}</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div style={{ height: 116, borderRadius: 20, background: `${tone}1f`, border: `1px solid ${tone}25` }} /><div style={{ height: 116, borderRadius: 20, background: "rgba(255,253,248,.78)", border: `1px solid ${palette.border}` }} /></div></article>;
}
