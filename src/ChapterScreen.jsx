import { useEffect, useMemo, useState } from "react";
import {
  CAPSULE_SETUP_ERROR,
  getOrCreateMonthlyCapsule,
  getPrefs,
  lockCapsule,
  monthBounds,
  replaceCapsuleItems,
  saveCapsuleLetter,
} from "./capsuleCore";
import { appSurface, emptyStateCard, field, palette, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Monthly chapter",
    subtitle: "Turn this month's memories into something worth keeping.",
    setupTitle: "Chapters need one database step.",
    setupBody: "Run supabase/chapters.sql in Supabase, then reopen this screen.",
    noMemories: "No memories saved this month yet. Add a few moments first.",
    included: "Included memories",
    allMonth: "This month's memories",
    letter: "Parent note",
    save: "Save chapter",
    saved: "Chapter saved.",
    lock: "Lock chapter",
    unlock: "Unlock chapter",
    locked: "Locked",
    draft: "Draft",
    close: "Close",
    error: "Could not save chapter.",
    loading: "Loading...",
    selectedCount: (count) => `${count} selected`,
  },
  pt: {
    title: "Capítulo mensal",
    subtitle: "Transforma as memórias deste mês em algo para guardar.",
    setupTitle: "Os capítulos precisam de um passo na base de dados.",
    setupBody: "Corre supabase/chapters.sql no Supabase e reabre este ecrã.",
    noMemories: "Ainda não há memórias guardadas este mês. Adiciona alguns momentos primeiro.",
    included: "Memórias incluídas",
    allMonth: "Memórias deste mês",
    letter: "Nota dos pais",
    save: "Guardar capítulo",
    saved: "Capítulo guardado.",
    lock: "Fechar capítulo",
    unlock: "Reabrir capítulo",
    locked: "Fechado",
    draft: "Rascunho",
    close: "Fechar",
    error: "Não foi possível guardar o capítulo.",
    loading: "A carregar...",
    selectedCount: (count) => `${count} selecionadas`,
  },
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "short",
});

export default function ChapterScreen() {
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [capsule, setCapsule] = useState(null);
  const [monthEntries, setMonthEntries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [letter, setLetter] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const { user, profiles, entries, loading, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 800 });
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const profile = profiles.find((item) => item.id === profileId) || profiles[0];
  const profileColor = profile?.color || palette.accent;

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const loadChapter = async (nextProfileId = profileId) => {
    const targetProfile = profiles.find((item) => item.id === nextProfileId) || profiles[0];
    if (!user || !targetProfile) return;

    setBusy(true);
    setSetupMissing(false);
    try {
      const result = await getOrCreateMonthlyCapsule({
        user,
        profile: targetProfile,
        entries,
        period: monthBounds(),
        lang,
      });
      setCapsule(result.capsule);
      setMonthEntries(result.entries);
      setSelectedIds(result.selectedEntries.map((entry) => entry.id));
      setLetter(result.capsule.letter || "");
    } catch (error) {
      if (error?.message === CAPSULE_SETUP_ERROR) {
        setSetupMissing(true);
      } else {
        console.error("Failed to load chapter", error);
        showToast(copy.error);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const show = (event) => {
      const requestedProfileId = event.detail?.profileId || profiles[0]?.id || "";
      setProfileId(requestedProfileId);
      setOpen(true);
      refresh();
    };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-chapter", show);
    window.addEventListener("zommy:hide-chapter", hide);
    return () => {
      window.removeEventListener("zommy:show-chapter", show);
      window.removeEventListener("zommy:hide-chapter", hide);
    };
  }, [profiles, refresh]);

  useEffect(() => {
    if (open && user && profiles.length && entries) loadChapter(profileId || profiles[0].id);
  }, [open, user, profiles.length, entries.length]);

  if (!open || !user) return null;

  const isLocked = capsule?.status === "locked";

  const toggleSelected = (entryId) => {
    if (isLocked) return;
    setSelectedIds((current) => current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]);
  };

  const saveChapter = async () => {
    if (!capsule || isLocked) return;
    setBusy(true);
    try {
      await saveCapsuleLetter({ capsuleId: capsule.id, letter });
      await replaceCapsuleItems({ capsuleId: capsule.id, entryIds: selectedIds });
      await loadChapter(profileId);
      showToast(copy.saved);
    } catch (error) {
      console.error("Failed to save chapter", error);
      showToast(copy.error);
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async () => {
    if (!capsule) return;
    setBusy(true);
    try {
      if (!isLocked) {
        await saveCapsuleLetter({ capsuleId: capsule.id, letter });
        await replaceCapsuleItems({ capsuleId: capsule.id, entryIds: selectedIds });
      }
      await lockCapsule({ capsuleId: capsule.id, locked: !isLocked });
      await loadChapter(profileId);
    } catch (error) {
      console.error("Failed to lock chapter", error);
      showToast(copy.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ ...appSurface, zIndex: 980 }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", padding: "20px 20px 112px", display: "grid", gap: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ color: profileColor, fontSize: 12, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0 }}>{copy.title}</div>
            <h1 style={titleStyle}>{capsule?.title || copy.title}</h1>
            <p style={subtitleStyle}>{copy.subtitle}</p>
          </div>
          <button onClick={() => setOpen(false)} style={ghostButton()}>{copy.close}</button>
        </header>

        {toast && <div role="status" style={toastStyle}>{toast}</div>}

        {setupMissing ? (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>{copy.setupTitle}</h2>
            <p style={bodyStyle}>{copy.setupBody}</p>
          </section>
        ) : (
          <>
            {profiles.length > 1 && (
              <section style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {profiles.map((item) => {
                  const selected = profile?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => { setProfileId(item.id); loadChapter(item.id); }} style={{ flexShrink: 0, border: `1px solid ${selected ? palette.accentLine : palette.line}`, background: selected ? palette.accentSoft : palette.surface, color: selected ? item.color || palette.accent : palette.muted, borderRadius: 999, minHeight: 48, padding: "9px 12px", fontSize: 13, fontWeight: type.weight.ui }}>{item.emoji || "👶"} {item.name}</button>
                  );
                })}
              </section>
            )}

            <section style={{ ...panelStyle, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={eyebrowStyle}>{copy.included}</div>
                  <div style={{ fontSize: 15, fontWeight: type.weight.heading, marginTop: 3 }}>{copy.selectedCount(selectedIds.length)} · {isLocked ? copy.locked : copy.draft}</div>
                </div>
                <button disabled={busy} onClick={toggleLock} style={inlineButton(isLocked ? palette.warning : palette.success)}>{isLocked ? copy.unlock : copy.lock}</button>
              </div>
            </section>

            <label style={labelStyle}>
              {copy.letter}
              <textarea value={letter} disabled={isLocked || busy} onChange={(event) => setLetter(event.target.value)} rows={7} style={{ ...field, lineHeight: 1.6, resize: "vertical", textTransform: "none", letterSpacing: 0 }} />
            </label>

            {!isLocked && <button disabled={busy} onClick={saveChapter} style={primaryButton()}>{copy.save}</button>}

            {monthEntries.length === 0 ? (
              <section style={emptyStateCard}><p style={bodyStyle}>{copy.noMemories}</p></section>
            ) : (
              <section style={{ display: "grid", gap: 10 }}>
                <h2 style={eyebrowStyle}>{copy.allMonth}</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {monthEntries.map((entry) => {
                    const selected = selectedIds.includes(entry.id);
                    return (
                      <button key={entry.id} onClick={() => toggleSelected(entry.id)} style={{ border: `1px solid ${selected ? palette.accentLine : palette.line}`, background: selected ? palette.accentSoft : palette.surface, color: palette.stone, borderRadius: 20, padding: 10, display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 11, alignItems: "center", textAlign: "left", cursor: isLocked ? "default" : "pointer", boxShadow: palette.shadow }}>
                        {entry.photoUrl ? <img src={entry.photoUrl} alt="" style={{ width: 70, height: 78, objectFit: "cover", borderRadius: 13 }} /> : <div style={{ width: 70, height: 78, borderRadius: 13, background: profile?.bg || palette.accentSoft, color: profileColor, display: "grid", placeItems: "center" }}>{profile?.emoji || "○"}</div>}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: palette.muted, fontSize: 11, fontWeight: type.weight.ui }}>{formatDate(entry.date, lang)}</div>
                          <div style={{ color: palette.stone, fontSize: 14, lineHeight: 1.35, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entry.note || copy.title}</div>
                        </div>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: selected ? palette.accent : palette.wash, color: selected ? palette.surface : palette.muted, fontWeight: type.weight.heading }}>{selected ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {(busy || loading) && <div style={{ color: palette.muted, textAlign: "center", padding: 14 }}>{copy.loading}</div>}
      </div>
    </main>
  );
}

const titleStyle = { fontFamily: type.serif, fontSize: 32, lineHeight: 1.08, marginTop: 5, fontWeight: type.weight.heading, letterSpacing: 0 };
const sectionTitleStyle = { fontFamily: type.serif, fontSize: 24, fontWeight: type.weight.heading };
const subtitleStyle = { color: palette.muted, fontSize: 14, lineHeight: 1.5, marginTop: 7 };
const bodyStyle = { color: palette.faint, lineHeight: 1.6 };
const panelStyle = { border: "none", background: palette.surface, borderRadius: 20, padding: 16, boxShadow: palette.shadow };
const toastStyle = { background: palette.surface, color: palette.stone, borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: type.weight.ui, boxShadow: palette.shadow };
const eyebrowStyle = { color: palette.muted, fontSize: 12, fontWeight: type.weight.ui, letterSpacing: 0, textTransform: "uppercase" };
const labelStyle = { display: "grid", gap: 8, color: palette.muted, fontSize: 11, fontWeight: type.weight.ui, letterSpacing: 0, textTransform: "uppercase" };

const ghostButton = () => ({ border: `1px solid ${palette.line}`, background: palette.surface, color: palette.muted, borderRadius: 999, minHeight: 48, padding: "8px 12px", fontSize: 13, fontWeight: type.weight.ui, cursor: "pointer" });
const inlineButton = (color = palette.accent) => ({ border: `1px solid ${palette.line}`, background: palette.surface, color, borderRadius: 999, minHeight: 48, padding: "9px 12px", fontSize: 12, fontWeight: type.weight.ui, whiteSpace: "nowrap", cursor: "pointer" });
const primaryButton = () => ({ width: "100%", border: "none", background: palette.accent, color: palette.surface, borderRadius: 16, minHeight: 52, padding: "14px 16px", fontSize: 15, fontWeight: type.weight.heading, cursor: "pointer" });
