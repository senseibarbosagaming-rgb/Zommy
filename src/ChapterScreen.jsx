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
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Monthly chapter",
    subtitle: "Turn this month’s memories into something worth keeping.",
    setupTitle: "Chapters need one database step.",
    setupBody: "Run supabase/chapters.sql in Supabase, then reopen this screen.",
    noMemories: "No memories saved this month yet. Add a few moments first.",
    included: "Included memories",
    allMonth: "This month’s memories",
    letter: "Parent note",
    save: "Save chapter",
    saved: "Chapter saved.",
    lock: "Lock chapter",
    unlock: "Unlock chapter",
    locked: "Locked",
    draft: "Draft",
    close: "Close",
    error: "Could not save chapter.",
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
    <main style={{ position: "fixed", inset: 0, zIndex: 980, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", padding: "20px 16px 112px", display: "grid", gap: 14 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ color: profile?.color || "#34D399", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.8px" }}>{copy.title}</div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 32, lineHeight: 1.08, marginTop: 5 }}>{capsule?.title || copy.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.5, marginTop: 7 }}>{copy.subtitle}</p>
          </div>
          <button onClick={() => setOpen(false)} style={ghostButton()}>{copy.close}</button>
        </header>

        {toast && <div role="status" style={{ background: "#fff", color: "#111", borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 850 }}>{toast}</div>}

        {setupMissing ? (
          <section style={panelStyle()}>
            <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 24 }}>{copy.setupTitle}</h2>
            <p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>{copy.setupBody}</p>
          </section>
        ) : (
          <>
            {profiles.length > 1 && (
              <section style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {profiles.map((item) => (
                  <button key={item.id} onClick={() => { setProfileId(item.id); loadChapter(item.id); }} style={{ flexShrink: 0, border: `1px solid ${profile?.id === item.id ? item.color : "rgba(255,255,255,0.14)"}`, background: profile?.id === item.id ? `${item.color}22` : "rgba(255,255,255,0.045)", color: profile?.id === item.id ? item.color : "rgba(255,255,255,0.72)", borderRadius: 999, padding: "9px 12px", fontSize: 13, fontWeight: 900 }}>{item.emoji || "👶"} {item.name}</button>
                ))}
              </section>
            )}

            <section style={{ ...panelStyle(), display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{copy.included}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, marginTop: 3 }}>{copy.selectedCount(selectedIds.length)} · {isLocked ? copy.locked : copy.draft}</div>
                </div>
                <button disabled={busy} onClick={toggleLock} style={inlineButton(isLocked ? "#FBBF24" : "#34D399")}>{isLocked ? copy.unlock : copy.lock}</button>
              </div>
            </section>

            <label style={{ display: "grid", gap: 8, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>
              {copy.letter}
              <textarea value={letter} disabled={isLocked || busy} onChange={(event) => setLetter(event.target.value)} rows={7} style={{ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.055)", color: "#fff", borderRadius: 18, padding: 14, font: "inherit", fontSize: 15, lineHeight: 1.6, resize: "vertical", textTransform: "none", letterSpacing: 0, fontWeight: 500 }} />
            </label>

            {!isLocked && <button disabled={busy} onClick={saveChapter} style={primaryButton()}>{copy.save}</button>}

            {monthEntries.length === 0 ? (
              <section style={panelStyle()}><p style={{ color: "rgba(255,255,255,0.66)", lineHeight: 1.6 }}>{copy.noMemories}</p></section>
            ) : (
              <section style={{ display: "grid", gap: 10 }}>
                <h2 style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{copy.allMonth}</h2>
                <div style={{ display: "grid", gap: 9 }}>
                  {monthEntries.map((entry) => {
                    const selected = selectedIds.includes(entry.id);
                    return (
                      <button key={entry.id} onClick={() => toggleSelected(entry.id)} style={{ border: `1px solid ${selected ? profile?.color || "#34D399" : "rgba(255,255,255,0.12)"}`, background: selected ? `${profile?.color || "#34D399"}18` : "rgba(255,255,255,0.04)", color: "#fff", borderRadius: 18, padding: 10, display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 11, alignItems: "center", textAlign: "left", cursor: isLocked ? "default" : "pointer" }}>
                        {entry.photoUrl ? <img src={entry.photoUrl} alt="" style={{ width: 70, height: 78, objectFit: "cover", borderRadius: 13 }} /> : <div style={{ width: 70, height: 78, borderRadius: 13, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>{profile?.emoji || "📷"}</div>}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 900 }}>{formatDate(entry.date, lang)}</div>
                          <div style={{ color: "#fff", fontSize: 14, lineHeight: 1.35, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entry.note || copy.title}</div>
                        </div>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", background: selected ? profile?.color || "#34D399" : "rgba(255,255,255,0.08)", color: selected ? "#101418" : "rgba(255,255,255,0.5)", fontWeight: 950 }}>{selected ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {(busy || loading) && <div style={{ color: "rgba(255,255,255,0.48)", textAlign: "center", padding: 14 }}>Loading…</div>}
      </div>
    </main>
  );
}

const panelStyle = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.045)", borderRadius: 20, padding: 15 });
const ghostButton = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, minHeight: 44, padding: "8px 12px", fontSize: 13, fontWeight: 850, cursor: "pointer" });
const inlineButton = (color = "#34D399") => ({ border: `1px solid ${color}66`, background: `${color}22`, color, borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap", cursor: "pointer" });
const primaryButton = () => ({ width: "100%", border: "none", background: "#34D399", color: "#101418", borderRadius: 16, minHeight: 52, padding: "14px 16px", fontSize: 15, fontWeight: 950, cursor: "pointer" });
