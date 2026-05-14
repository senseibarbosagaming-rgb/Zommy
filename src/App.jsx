import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LANGS = {
  en: {
    tagline: "A quiet record of them growing up.",
    addChild: "+ add a child",
    compareDays: "Compare",
    newChild: "New profile",
    name: "Name",
    birthDate: "Birth date",
    emoji: "Emoji",
    colour: "Colour",
    addChildBtn: "Add",
    cancel: "Cancel",
    entries: "memories",
    entry: "memory",
    noChildren: "No children yet.\nAdd your first profile to start.",
    addMemory: "Memory",
    timeline: "Timeline",
    compare: "Compare",
    settings: "Settings",
    logFor: (name) => `New memory — ${name}`,
    editEntry: "Edit memory",
    date: "Date",
    photo: "Photo",
    note: "Note",
    noteOptional: "(optional)",
    tapPhoto: "Tap to choose a photo",
    saveEntry: "Save memory",
    saveChanges: "Save changes",
    noEntries: "No memories yet.",
    edit: "Edit",
    delete: "Delete",
    share: "Share",
    dayA: "Memory A",
    dayB: "Memory B",
    pickDay: "Pick a memory",
    noEntriesYet: "No entries yet",
    change: "change",
    language: "Language",
    theme: "Theme",
    changelog: "Changelog",
    exportZip: "Export photos",
    onThisDay: (age) => `${age} on this day`,
    filterAll: "All",
    settingsTitle: "Settings",
    themeLight: "Light",
    themeDark: "Dark",
    loading: "Loading…",
    saving: "Saving…",
    error: "Something went wrong",
    whoFor: "Who is this memory for?",
  },
  pt: {
    tagline: "Um registo tranquilo do crescimento deles.",
    addChild: "+ adicionar criança",
    compareDays: "Comparar",
    newChild: "Novo perfil",
    name: "Nome",
    birthDate: "Data de nascimento",
    emoji: "Emoji",
    colour: "Cor",
    addChildBtn: "Adicionar",
    cancel: "Cancelar",
    entries: "memórias",
    entry: "memória",
    noChildren: "Nenhuma criança ainda.\nAdiciona o primeiro perfil para começar.",
    addMemory: "Memória",
    timeline: "Timeline",
    compare: "Comparar",
    settings: "Definições",
    logFor: (name) => `Nova memória — ${name}`,
    editEntry: "Editar memória",
    date: "Data",
    photo: "Foto",
    note: "Nota",
    noteOptional: "(opcional)",
    tapPhoto: "Toca para escolher uma foto",
    saveEntry: "Guardar",
    saveChanges: "Guardar alterações",
    noEntries: "Sem memórias ainda.",
    edit: "Editar",
    delete: "Eliminar",
    share: "Partilhar",
    dayA: "Memória A",
    dayB: "Memória B",
    pickDay: "Escolhe uma memória",
    noEntriesYet: "Sem registos ainda",
    change: "alterar",
    language: "Idioma",
    theme: "Tema",
    changelog: "Novidades",
    exportZip: "Exportar fotos",
    onThisDay: (age) => `${age} neste dia`,
    filterAll: "Tudo",
    settingsTitle: "Definições",
    themeLight: "Claro",
    themeDark: "Escuro",
    loading: "A carregar…",
    saving: "A guardar…",
    error: "Algo correu mal",
    whoFor: "Para quem é esta memória?",
  },
};

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (d, lang) =>
  new Date(d + "T12:00:00").toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

const formatDateShort = (d, lang) =>
  new Date(d + "T12:00:00").toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric", month: "short",
  });

const getAge = (birthdate, onDate) => {
  if (!birthdate || !onDate) return null;
  const birth = new Date(birthdate + "T12:00:00");
  const on = new Date(onDate + "T12:00:00");
  const diffMs = on - birth;
  if (diffMs < 0) return null;
  const totalDays = Math.floor(diffMs / 86400000);
  const years = Math.floor(totalDays / 365.25);
  const months = Math.floor((totalDays % 365.25) / 30.44);
  const days = Math.floor(totalDays % 30.44);
  if (years >= 1) return months === 0 ? `${years}y` : `${years}y ${months}m`;
  if (months >= 1) return days === 0 ? `${months}m` : `${months}m ${days}d`;
  return `${totalDays}d`;
};

const getAgeFull = (birthdate, onDate) => {
  if (!birthdate || !onDate) return null;
  const birth = new Date(birthdate + "T12:00:00");
  const on = new Date(onDate + "T12:00:00");
  const diffMs = on - birth;
  if (diffMs < 0) return null;
  const totalDays = Math.floor(diffMs / 86400000);
  const years = Math.floor(totalDays / 365.25);
  const months = Math.floor((totalDays % 365.25) / 30.44);
  const days = Math.floor(totalDays % 30.44);
  if (years >= 1) return months === 0 ? `${years} year${years !== 1 ? "s" : ""} old` : `${years} year${years !== 1 ? "s" : ""} and ${months} month${months !== 1 ? "s" : ""} old`;
  if (months >= 1) return days === 0 ? `${months} month${months !== 1 ? "s" : ""} old` : `${months} month${months !== 1 ? "s" : ""} and ${days} day${days !== 1 ? "s" : ""} old`;
  return `${totalDays} day${totalDays !== 1 ? "s" : ""} old`;
};

const PALETTE = [
  { color: "#60A5FA", bg: "#1e3a5f" },
  { color: "#F472B6", bg: "#5f1e3a" },
  { color: "#34D399", bg: "#1e5f3a" },
  { color: "#FBBF24", bg: "#5f4a1e" },
  { color: "#A78BFA", bg: "#3a1e5f" },
  { color: "#FB7185", bg: "#5f1e2a" },
];

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];

const THEMES = {
  dark:  {
    bg: "#111111", card: "#1a1a1a", cardHover: "#222222",
    border: "#2a2a2a", borderLight: "#333333",
    text: "#f0f0f0", textSub: "#888888", textMuted: "#555555",
    navBg: "#0d0d0d", navBorder: "#222222",
    accent: "#ffffff", accentSub: "#aaaaaa",
    chip: "#1e1e1e", chipBorder: "#333333",
    input: "#1a1a1a", inputBorder: "#333333",
    overlay: "rgba(0,0,0,0.95)",
  },
  light: {
    bg: "#f8f6f3", card: "#ffffff", cardHover: "#f5f3f0",
    border: "#e8e4df", borderLight: "#ede9e4",
    text: "#111111", textSub: "#777777", textMuted: "#aaaaaa",
    navBg: "#ffffff", navBorder: "#e8e4df",
    accent: "#111111", accentSub: "#555555",
    chip: "#ffffff", chipBorder: "#e8e4df",
    input: "#ffffff", inputBorder: "#e8e4df",
    overlay: "rgba(0,0,0,0.92)",
  },
};

const CHANGELOG = [
  { version: "1.6", date: "2025", notes: "Premium UI redesign. Share to apps. Simplified themes. Centred memory button." },
  { version: "1.5", date: "2025", notes: "Supabase sync — data shared across all devices in real time." },
  { version: "1.4", date: "2025", notes: "Settings, language, themes, export. Timeline photo wall. Entry detail view." },
  { version: "1.3", date: "2025", notes: "Edit and delete entries. Improved age display." },
  { version: "1.0", date: "2025", notes: "Initial release." },
];

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || '{"lang":"en","theme":"dark"}'); }
  catch { return { lang: "en", theme: "dark" }; }
};
const savePrefs = (p) => { try { localStorage.setItem("zommy_prefs", JSON.stringify(p)); } catch {} };

// ── component ─────────────────────────────────────────────────────────────────

export default function Zommy() {
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState({});
  const [prefs, setPrefs] = useState(loadPrefs);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [logDate, setLogDate] = useState(today());
  const [logNote, setLogNote] = useState("");
  const [logPhoto, setLogPhoto] = useState(null);
  const [logPreview, setLogPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef();

  const [expandedEntry, setExpandedEntry] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [newEmoji, setNewEmoji] = useState("👶");
  const [newPalette, setNewPalette] = useState(0);

  const [compareId, setCompareId] = useState(null);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  const t = LANGS[prefs.lang] || LANGS.en;
  const T = THEMES[prefs.theme] || THEMES.dark;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const updatePrefs = (p) => { setPrefs(p); savePrefs(p); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: pd }, { data: ed }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("entries").select("*").order("date", { ascending: false }),
      ]);
      setProfiles(pd || []);
      const grouped = {};
      for (const p of (pd || [])) grouped[p.id] = [];
      for (const e of (ed || [])) { if (!grouped[e.profile_id]) grouped[e.profile_id] = []; grouped[e.profile_id].push(e); }
      setEntries(grouped);
    } catch { showToast(t.error); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const active = profiles.find((p) => p.id === activeId);
  const activeEntries = activeId ? (entries[activeId] || []) : [];
  const sortedEntries = useMemo(() => [...activeEntries].sort((a, b) =>
    b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id), [activeEntries]);
  const availableMonths = useMemo(() => Array.from(new Set(sortedEntries.map((e) => e.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)), [sortedEntries]);
  const filteredEntries = useMemo(() => !filterMonth ? sortedEntries : sortedEntries.filter((e) => e.date.startsWith(filterMonth)), [sortedEntries, filterMonth]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { setLogPhoto(ev.target.result); setLogPreview(ev.target.result); };
    r.readAsDataURL(file);
  };

  const uploadPhoto = async (dataUrl) => {
    const base64 = dataUrl.split(",")[1];
    const byteArr = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const filename = `${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from("photos").upload(filename, byteArr, { contentType: "image/jpeg" });
    if (error) throw error;
    return supabase.storage.from("photos").getPublicUrl(data.path).data.publicUrl;
  };

  const saveEntry = async () => {
    if (!logPhoto) { showToast("Add a photo first 📷"); return; }
    setSaving(true);
    try {
      let photoUrl = logPhoto.startsWith("data:") ? await uploadPhoto(logPhoto) : logPhoto;
      if (editingId) {
        await supabase.from("entries").update({ date: logDate, photo: photoUrl, note: logNote }).eq("id", editingId);
      } else {
        await supabase.from("entries").insert({ id: Date.now(), profile_id: activeId, date: logDate, photo: photoUrl, note: logNote });
      }
      await loadData();
      setLogPhoto(null); setLogPreview(null); setLogNote(""); setLogDate(today()); setEditingId(null);
      showToast(editingId ? "Updated ✓" : "Saved ✓");
      setView("timeline");
    } catch { showToast(t.error); }
    setSaving(false);
  };

  const startEdit = (entry) => {
    setEditingId(entry.id); setLogDate(entry.date); setLogNote(entry.note || "");
    setLogPhoto(entry.photo); setLogPreview(entry.photo); setExpandedEntry(null); setView("log");
  };

  const deleteEntry = async (entryId) => {
    try {
      await supabase.from("entries").delete().eq("id", entryId);
      setEntries((prev) => { const u = { ...prev }; if (activeId) u[activeId] = (u[activeId] || []).filter((e) => e.id !== entryId); return u; });
      setExpandedEntry(null);
      showToast("Deleted");
    } catch { showToast(t.error); }
  };

  const shareEntry = async (entry) => {
    if (!navigator.share) { showToast("Share not supported on this browser"); return; }
    try {
      const profile = expandedProfile || active;
      const text = [
        profile?.name,
        formatDate(entry.date, prefs.lang),
        profile && getAgeFull(profile.birthdate, entry.date),
        entry.note,
      ].filter(Boolean).join(" · ");
      await navigator.share({ title: "Zommy", text, url: entry.photo });
      } catch {}
  };

  const createProfile = async () => {
    if (!newName.trim()) { showToast("Add a name"); return; }
    if (!newBirth) { showToast("Add a birth date"); return; }
    setSaving(true);
    try {
      const id = `child_${Date.now()}`;
      const pal = PALETTE[newPalette];
      await supabase.from("profiles").insert({ id, name: newName.trim(), birthdate: newBirth, emoji: newEmoji, color: pal.color, bg: pal.bg });
      await loadData();
      setNewName(""); setNewBirth(""); setNewEmoji("👶"); setNewPalette(0); setShowForm(false);
      showToast(`${newName.trim()} added 🎉`);
    } catch { showToast(t.error); }
    setSaving(false);
  };

  const goLog = (id) => {
    setActiveId(id); setEditingId(null);
    setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null);
    setView("log");
  };

  const handleExport = () => {
    const all = Object.entries(entries).flatMap(([pid, ents]) => {
      const profile = profiles.find((p) => p.id === pid);
      return ents.map((e) => ({ ...e, profileName: profile?.name || pid }));
    });
    if (!all.length) { showToast("No photos to export"); return; }
    const html = `<html><body style="background:#111;color:#fff;font-family:sans-serif;padding:20px">${all.map((e) =>
      `<div style="margin:0 0 32px"><img src="${e.photo}" style="width:100%;max-width:480px;border-radius:12px;display:block"/><div style="margin-top:10px;font-size:14px;opacity:.7"><b>${e.profileName}</b> · ${e.date}${e.note ? ` · ${e.note}` : ""}</div></div>`
    ).join("")}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = "zommy-export.html"; a.click();
    showToast("Export ready ✓");
  };

  const monthLabel = (ym) => {
    const [y, m] = ym.split("-");
    return `${(prefs.lang === "pt" ? MONTHS_PT : MONTHS_EN)[parseInt(m, 10) - 1]} ${y}`;
  };

  // ── styles ────────────────────────────────────────────────────────────────

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    body{background:${T.bg}}
    .f{animation:fu 0.25s ease forwards}
    @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .b{transition:all .12s;cursor:pointer}
    .b:active{transform:scale(.97);opacity:.8}
    input:focus,textarea:focus{outline:none}
    input[type=date]::-webkit-calendar-picker-indicator{opacity:.3;cursor:pointer;filter:${prefs.theme === "dark" ? "invert(1)" : "none"}}
    ::-webkit-scrollbar{width:0;height:0}
    .wallItem{transition:opacity .1s}.wallItem:active{opacity:.7}
    .chip{transition:all .15s}
  `;

  const font = "'Inter', sans-serif";
  const fontSerif = "'Lora', serif";

  return (
    <div style={{ fontFamily: font, background: T.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: prefs.theme === "dark" ? "#ffffff" : "#111111", color: prefs.theme === "dark" ? "#111" : "#fff", padding: "10px 20px", borderRadius: 100, fontSize: 13, fontWeight: 500, zIndex: 300, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* ENTRY OVERLAY */}
      {expandedEntry && (() => {
        const entry = expandedEntry;
        const profile = expandedProfile || active || profiles.find((p) => (entries[p.id] || []).some((e) => e.id === entry.id));
        return (
          <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* photo */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={entry.photo} alt="" style={{ width: "100%", maxHeight: "60vh", objectFit: "cover", display: "block" }} />
              {/* close */}
              <button className="b" onClick={() => setExpandedEntry(null)}
                style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
                ×
              </button>
            </div>

            {/* info */}
            <div style={{ flex: 1, padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 8, background: "#0d0d0d" }}>
              {profile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: profile.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: profile.color, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase" }}>{profile.name}</span>
                </div>
              )}
              <div style={{ fontFamily: fontSerif, fontSize: 22, color: "#ffffff", fontWeight: 600, lineHeight: 1.3 }}>{formatDate(entry.date, prefs.lang)}</div>
              {profile && getAgeFull(profile.birthdate, entry.date) && (
                <div style={{ fontSize: 14, color: "#666", fontStyle: "italic" }}>{getAgeFull(profile.birthdate, entry.date)}</div>
              )}
              {entry.note && (
                <div style={{ fontSize: 16, color: "#bbb", lineHeight: 1.7, marginTop: 8, fontWeight: 300 }}>{entry.note}</div>
              )}

              {/* actions */}
              <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 32 }}>
                <button className="b" onClick={() => shareEntry(entry)}
                  style={{ flex: 1, padding: "13px", background: "#1e1e1e", border: "1px solid #333", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font, color: "#fff" }}>
                  ↑ {t.share}
                </button>
                <button className="b" onClick={() => startEdit(entry)}
                  style={{ flex: 1, padding: "13px", background: "#1e1e1e", border: "1px solid #333", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font, color: "#fff" }}>
                  ✎ {t.edit}
                </button>
                <button className="b" onClick={() => deleteEntry(entry.id)}
                  style={{ flex: 1, padding: "13px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font, color: "#ef4444" }}>
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HEADER */}
      <header style={{ background: T.navBg, borderBottom: `1px solid ${T.navBorder}`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <span style={{ fontFamily: fontSerif, fontStyle: "italic", fontSize: 24, color: T.text, lineHeight: 1 }}>z</span>
          <span style={{ fontFamily: fontSerif, fontSize: 20, color: T.text, fontWeight: 400, letterSpacing: "-0.3px" }}>ommy</span>
        </div>
        {/* subtle active profile indicator */}
        {active && (view === "timeline" || view === "log") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: active.color }} />
            <span style={{ fontSize: 13, color: T.textSub, fontWeight: 500 }}>{active.name}</span>
          </div>
        )}
      </header>

      <main style={{ flex: 1, paddingBottom: 80, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: T.textMuted, fontSize: 14, fontStyle: "italic", fontFamily: fontSerif }}>
            {t.loading}
          </div>
        ) : (
          <>

            {/* ── HOME ── */}
            {view === "home" && (
              <div className="f" style={{ padding: "28px 20px 20px" }}>
                <p style={{ fontFamily: fontSerif, fontStyle: "italic", color: T.textMuted, fontSize: 14, marginBottom: 28, letterSpacing: "0.1px" }}>{t.tagline}</p>

                {profiles.length === 0 && !showForm && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "48px 20px" }}>
                    <span style={{ fontSize: 48 }}>🌱</span>
                    <p style={{ color: T.textSub, fontSize: 14, textAlign: "center", lineHeight: 1.7, whiteSpace: "pre-line" }}>{t.noChildren}</p>
                  </div>
                )}

                {/* profile grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  {profiles.map((p) => {
                    const pe = entries[p.id] || [];
                    const latest = [...pe].sort((a, b) => b.date.localeCompare(a.date))[0];
                    return (
                      <div key={p.id} className="b"
                        style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", cursor: "pointer" }}
                        onClick={() => { setActiveId(p.id); setView("timeline"); }}>
                        {/* cover photo */}
                        <div style={{ height: 110, background: T.bg, overflow: "hidden", position: "relative" }}>
                          {latest?.photo
                            ? <img src={latest.photo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, background: `${p.color}15` }}>{p.emoji}</div>}
                          {/* color bar */}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: p.color }} />
                        </div>
                        <div style={{ padding: "12px 14px 14px" }}>
                          <div style={{ fontFamily: fontSerif, fontSize: 16, color: T.text, fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: p.color, marginTop: 2, fontWeight: 500 }}>{getAgeFull(p.birthdate, today()) || ""}</div>
                          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{pe.length} {pe.length === 1 ? t.entry : t.entries}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* add profile form */}
                {showForm ? (
                  <div className="f" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 18px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontFamily: fontSerif, fontSize: 18, color: T.text, fontWeight: 600 }}>{t.newChild}</div>
                    {[
                      { label: t.name, el: <input type="text" placeholder="e.g. Tommy" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, fontSize: 15, background: T.input, color: T.text, fontFamily: font, width: "100%" }} /> },
                      { label: t.birthDate, el: <input type="date" value={newBirth} max={today()} onChange={(e) => setNewBirth(e.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, fontSize: 15, background: T.input, color: T.text, fontFamily: font, width: "100%" }} /> },
                    ].map(({ label, el }) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{label}</span>
                        {el}
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{t.emoji}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {EMOJIS.map((em) => (
                          <button key={em} className="b" onClick={() => setNewEmoji(em)}
                            style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${newEmoji === em ? T.text : T.border}`, background: newEmoji === em ? T.text + "15" : "transparent", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{em}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{t.colour}</span>
                      <div style={{ display: "flex", gap: 10 }}>
                        {PALETTE.map((p, i) => (
                          <button key={i} className="b" onClick={() => setNewPalette(i)}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: p.color, outline: newPalette === i ? `3px solid ${p.color}` : "none", outlineOffset: 3, cursor: "pointer" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="b" disabled={saving}
                        style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: T.text, color: T.bg, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font }}
                        onClick={createProfile}>{saving ? t.saving : t.addChildBtn}</button>
                      <button className="b" style={{ flex: 1, padding: "13px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, fontSize: 14, cursor: "pointer", fontFamily: font }} onClick={() => setShowForm(false)}>{t.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <button className="b"
                    style={{ width: "100%", padding: "13px", background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 12, fontSize: 14, color: T.textSub, cursor: "pointer", fontFamily: font, marginBottom: 10 }}
                    onClick={() => setShowForm(true)}>{t.addChild}</button>
                )}

                {profiles.length >= 2 && (
                  <button className="b"
                    style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.textSub, cursor: "pointer", fontFamily: font }}
                    onClick={() => { setCompareId(profiles[0].id); setCompareA(null); setCompareB(null); setView("compare"); }}>
                    {t.compareDays}
                  </button>
                )}
              </div>
            )}

            {/* ── LOG ── */}
            {view === "log" && (
              <div className="f" style={{ padding: "24px 20px" }}>
                {!active ? (
                  <div>
                    <div style={{ fontFamily: fontSerif, fontSize: 20, color: T.text, fontWeight: 600, marginBottom: 16 }}>{t.whoFor}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {profiles.map((p) => (
                        <button key={p.id} className="b"
                          style={{ padding: "16px 18px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
                          onClick={() => setActiveId(p.id)}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 16, color: T.text, fontWeight: 500 }}>{p.emoji} {p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, color: active.color, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>{active.emoji} {active.name}</div>
                      <h2 style={{ fontFamily: fontSerif, fontSize: 22, color: T.text, fontWeight: 600 }}>{editingId ? t.editEntry : t.logFor(active.name).split("—")[1]?.trim() || t.logFor(active.name)}</h2>
                      {getAgeFull(active.birthdate, logDate) && (
                        <div style={{ fontSize: 13, color: T.textSub, fontStyle: "italic", marginTop: 4 }}>{t.onThisDay(getAgeFull(active.birthdate, logDate))}</div>
                      )}
                    </div>

                    {profiles.length > 1 && !editingId && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                        {profiles.map((p) => (
                          <button key={p.id} className="b chip" onClick={() => setActiveId(p.id)}
                            style={{ padding: "7px 14px", borderRadius: 100, border: `1px solid ${activeId === p.id ? p.color : T.border}`, background: activeId === p.id ? p.color + "20" : "transparent", color: activeId === p.id ? p.color : T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}>
                            {p.emoji} {p.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* date */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{t.date}</span>
                        <input type="date" value={logDate} max={today()} onChange={(e) => setLogDate(e.target.value)}
                          style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, fontSize: 15, background: T.input, color: T.text, fontFamily: font, width: "100%" }} />
                      </div>

                      {/* photo */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{t.photo}</span>
                        {logPreview ? (
                          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
                            <img src={logPreview} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
                            <button className="b"
                              style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: 100, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: font, backdropFilter: "blur(4px)" }}
                              onClick={() => { setLogPhoto(null); setLogPreview(null); }}>remove</button>
                          </div>
                        ) : (
                          <div className="b"
                            style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", background: T.card }}
                            onClick={() => fileRef.current.click()}>
                            <span style={{ fontSize: 28 }}>📷</span>
                            <span style={{ color: T.textMuted, fontSize: 13 }}>{t.tapPhoto}</span>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                          </div>
                        )}
                      </div>

                      {/* note */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <span style={{ fontSize: 11, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{t.note} <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>{t.noteOptional}</span></span>
                        <textarea value={logNote} onChange={(e) => setLogNote(e.target.value)}
                          placeholder="Said a new word. Laughed at the dog. Wouldn't eat dinner again."
                          rows={3}
                          style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.inputBorder}`, fontSize: 15, fontFamily: font, color: T.text, background: T.input, resize: "none", lineHeight: 1.6, width: "100%" }} />
                      </div>

                      <button className="b" disabled={saving}
                        style={{ padding: "15px", borderRadius: 12, border: "none", background: active.color, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: font, opacity: saving ? 0.7 : 1, marginTop: 4 }}
                        onClick={saveEntry}>{saving ? t.saving : editingId ? t.saveChanges : t.saveEntry}</button>

                      {editingId && (
                        <button className="b"
                          style={{ padding: "13px", borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, fontSize: 14, cursor: "pointer", fontFamily: font }}
                          onClick={() => { setEditingId(null); setView("timeline"); }}>{t.cancel}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TIMELINE ── */}
            {view === "timeline" && (
              <div className="f">
                {/* profile tabs */}
                <div style={{ padding: "16px 20px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {profiles.map((p) => (
                    <button key={p.id} className="b chip" onClick={() => { setActiveId(p.id); setFilterMonth(null); }}
                      style={{ padding: "7px 16px", borderRadius: 100, border: `1px solid ${activeId === p.id ? p.color : T.border}`, background: activeId === p.id ? p.color + "20" : "transparent", color: activeId === p.id ? p.color : T.textSub, fontSize: 13, fontWeight: activeId === p.id ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>

                {/* month filter */}
                {availableMonths.length > 1 && (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 20px 0", scrollbarWidth: "none" }}>
                    {[null, ...availableMonths].map((ym) => (
                      <button key={ym || "all"} className="b chip" onClick={() => setFilterMonth(ym)}
                        style={{ padding: "4px 12px", borderRadius: 100, border: `1px solid ${filterMonth === ym ? (active?.color || T.text) : T.chipBorder}`, background: filterMonth === ym ? (active?.color || T.text) + "20" : "transparent", color: filterMonth === ym ? (active?.color || T.text) : T.textMuted, fontSize: 11, fontWeight: filterMonth === ym ? 600 : 400, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {ym ? monthLabel(ym) : t.filterAll}
                      </button>
                    ))}
                  </div>
                )}

                {/* photo wall */}
                <div style={{ marginTop: 12, padding: "0 2px" }}>
                  {filteredEntries.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", color: T.textMuted, fontSize: 14 }}>
                      <span style={{ fontSize: 36 }}>📷</span><p>{t.noEntries}</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                      {filteredEntries.map((entry) => (
                        <div key={entry.id} className="wallItem b" style={{ aspectRatio: "1", overflow: "hidden", cursor: "pointer", background: T.card }}
                          onClick={() => { setExpandedEntry(entry); setExpandedProfile(active); }}>
                          <img src={entry.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COMPARE ── */}
            {view === "compare" && (
              <div className="f" style={{ padding: "24px 20px" }}>
                <h2 style={{ fontFamily: fontSerif, fontSize: 22, color: T.text, fontWeight: 600, marginBottom: 16 }}>{t.compare}</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {profiles.map((p) => (
                    <button key={p.id} className="b chip" onClick={() => { setCompareId(p.id); setCompareA(null); setCompareB(null); }}
                      style={{ padding: "7px 16px", borderRadius: 100, border: `1px solid ${compareId === p.id ? p.color : T.border}`, background: compareId === p.id ? p.color + "20" : "transparent", color: compareId === p.id ? p.color : T.textSub, fontSize: 13, fontWeight: compareId === p.id ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
                {(() => {
                  const cp = profiles.find((p) => p.id === compareId);
                  const cpe = [...(entries[compareId] || [])].sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id);
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[{ sel: compareA, set: setCompareA, lbl: t.dayA }, { sel: compareB, set: setCompareB, lbl: t.dayB }].map(({ sel, set, lbl }) => (
                        <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{lbl}</div>
                          {sel ? (
                            <div style={{ background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
                              <img src={sel.photo} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                              <div style={{ padding: "10px 12px 6px" }}>
                                <div style={{ fontFamily: fontSerif, fontSize: 13, fontWeight: 600, color: cp?.color }}>{formatDate(sel.date, prefs.lang)}</div>
                                {cp && getAgeFull(cp.birthdate, sel.date) && <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic", marginTop: 2 }}>{getAgeFull(cp.birthdate, sel.date)}</div>}
                                {sel.note && <div style={{ fontSize: 11, color: T.textSub, marginTop: 3, lineHeight: 1.4 }}>{sel.note}</div>}
                              </div>
                              <button className="b" onClick={() => set(null)} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 11, cursor: "pointer", padding: "4px 12px 10px", fontFamily: font }}>{t.change}</button>
                            </div>
                          ) : (
                            <div style={{ background: T.card, borderRadius: 12, padding: 12, minHeight: 150, border: `1px dashed ${T.border}` }}>
                              <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>{t.pickDay}</p>
                              {cpe.length === 0 && <p style={{ color: T.textMuted, fontSize: 11 }}>{t.noEntriesYet}</p>}
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                                {cpe.map((e) => (
                                  <button key={e.id} className="b" onClick={() => set(e)}
                                    style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
                                    <img src={e.photo} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: T.text, lineHeight: 1.4 }}>
                                      {formatDateShort(e.date, prefs.lang)}
                                      {cp && getAge(cp.birthdate, e.date) && <span style={{ display: "block", color: cp.color, fontWeight: 600 }}>{getAge(cp.birthdate, e.date)}</span>}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {view === "settings" && (
              <div className="f" style={{ padding: "24px 20px" }}>
                <h2 style={{ fontFamily: fontSerif, fontSize: 22, color: T.text, fontWeight: 600, marginBottom: 28 }}>{t.settingsTitle}</h2>

                {[
                  {
                    title: t.language,
                    content: (
                      <div style={{ display: "flex", gap: 8 }}>
                        {["en", "pt"].map((l) => (
                          <button key={l} className="b" onClick={() => updatePrefs({ ...prefs, lang: l })}
                            style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${prefs.lang === l ? T.text : T.border}`, background: prefs.lang === l ? T.text + "10" : "transparent", color: prefs.lang === l ? T.text : T.textSub, fontSize: 14, fontWeight: prefs.lang === l ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                            {l === "en" ? "🇬🇧 English" : "🇵🇹 Português"}
                          </button>
                        ))}
                      </div>
                    ),
                  },
                  {
                    title: t.theme,
                    content: (
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["dark", "🌙 " + t.themeDark], ["light", "☀️ " + t.themeLight]].map(([id, label]) => (
                          <button key={id} className="b" onClick={() => updatePrefs({ ...prefs, theme: id })}
                            style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${prefs.theme === id ? T.text : T.border}`, background: prefs.theme === id ? T.text + "10" : "transparent", color: prefs.theme === id ? T.text : T.textSub, fontSize: 14, fontWeight: prefs.theme === id ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    ),
                  },
                  {
                    title: t.exportZip,
                    content: (
                      <button className="b" onClick={handleExport}
                        style={{ width: "100%", padding: "13px", background: T.text, border: "none", borderRadius: 10, fontSize: 14, color: T.bg, cursor: "pointer", fontFamily: font, fontWeight: 600 }}>
                        📦 {t.exportZip}
                      </button>
                    ),
                  },
                ].map(({ title, content }) => (
                  <div key={title} style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600, marginBottom: 12 }}>{title}</div>
                    {content}
                  </div>
                ))}

                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600, marginBottom: 12 }}>{t.changelog}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {CHANGELOG.map((c) => (
                      <div key={c.version} style={{ background: T.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${T.border}` }}>
                        <div style={{ fontFamily: fontSerif, fontSize: 14, fontWeight: 600, color: T.text }}>
                          v{c.version} <span style={{ fontFamily: font, fontSize: 12, color: T.textMuted, fontWeight: 400 }}>— {c.date}</span>
                        </div>
                        <div style={{ fontSize: 13, color: T.textSub, marginTop: 4, lineHeight: 1.5 }}>{c.notes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.navBg, borderTop: `1px solid ${T.navBorder}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 0 14px", zIndex: 10 }}>
        {[
          { id: "home",     icon: "⌂",  label: "Home",      color: "#60A5FA", big: false },
          { id: "timeline", icon: "▦",  label: t.timeline,  color: "#34D399", big: false },
          { id: "log",      icon: "+",  label: t.addMemory, color: "#ffffff", big: true  },
          { id: "compare",  icon: "⇄",  label: t.compare,   color: "#FBBF24", big: false },
          { id: "settings", icon: "◎",  label: t.settings,  color: "#A78BFA", big: false },
        ].map((n) => {
          const isActive = view === n.id;
          if (n.big) return (
            <button key={n.id} className="b"
              style={{ width: 52, height: 52, borderRadius: "50%", background: "#ffffff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 20px rgba(255,255,255,0.2)", marginBottom: 6, flexShrink: 0 }}
              onClick={() => {
                if (!activeId && profiles.length > 0) setActiveId(profiles[0].id);
                setEditingId(null); setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null);
                setExpandedEntry(null); setView("log");
              }}>
              <span style={{ fontSize: 26, color: "#111", fontWeight: 300, lineHeight: 1, marginTop: -2 }}>+</span>
            </button>
          );
          return (
            <button key={n.id} className="b"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontFamily: font, padding: "4px 10px", minWidth: 48 }}
              onClick={() => {
                if (n.id === "timeline" && !activeId && profiles.length > 0) setActiveId(profiles[0].id);
                if (n.id === "compare" && profiles.length > 0) { setCompareId(profiles[0].id); setCompareA(null); setCompareB(null); }
                setExpandedEntry(null); setView(n.id);
              }}>
              <span style={{ fontSize: 19, color: isActive ? n.color : T.textMuted, transition: "color 0.15s" }}>{n.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? n.color : T.textMuted, transition: "color 0.15s" }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
