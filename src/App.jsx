import { useState, useRef, useMemo } from "react";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LANGS = {
  en: {
    tagline: "A quiet record of them growing up.",
    addChild: "+ add a child",
    compareDays: "⟷ compare days",
    newChild: "New child",
    name: "Name",
    birthDate: "Birth date",
    emoji: "Emoji",
    colour: "Colour",
    addChildBtn: "Add child",
    cancel: "Cancel",
    entries: "entries",
    entry: "entry",
    noChildren: "No children yet.\nAdd your first profile to start.",
    addMemory: "Add Memory",
    timeline: "Timeline",
    compare: "Compare",
    settings: "Settings",
    logFor: (name) => `New memory for ${name}`,
    editEntry: "Edit memory",
    date: "Date",
    photo: "Photo",
    note: "Note",
    noteOptional: "(optional)",
    tapPhoto: "tap to choose a photo",
    saveEntry: "Save memory",
    saveChanges: "Save changes",
    noEntries: "No memories yet.",
    edit: "Edit",
    delete: "Delete",
    dayA: "Memory A",
    dayB: "Memory B",
    pickDay: "Pick a memory",
    noEntriesYet: "No entries yet",
    change: "change",
    language: "Language",
    theme: "Theme",
    changelog: "Changelog",
    exportZip: "Export photos (.zip)",
    exporting: "Preparing export…",
    onThisDay: (age) => `${age} on this day`,
    filterAll: "All",
    settingsTitle: "Settings",
    themeLight: "Light",
    themeDark: "Dark",
    themeWarm: "Warm",
  },
  pt: {
    tagline: "Um registo tranquilo do crescimento deles.",
    addChild: "+ adicionar criança",
    compareDays: "⟷ comparar dias",
    newChild: "Nova criança",
    name: "Nome",
    birthDate: "Data de nascimento",
    emoji: "Emoji",
    colour: "Cor",
    addChildBtn: "Adicionar criança",
    cancel: "Cancelar",
    entries: "registos",
    entry: "registo",
    noChildren: "Nenhuma criança ainda.\nAdiciona o primeiro perfil para começar.",
    addMemory: "Memória",
    timeline: "Linha do tempo",
    compare: "Comparar",
    settings: "Definições",
    logFor: (name) => `Nova memória para ${name}`,
    editEntry: "Editar memória",
    date: "Data",
    photo: "Foto",
    note: "Nota",
    noteOptional: "(opcional)",
    tapPhoto: "toca para escolher uma foto",
    saveEntry: "Guardar memória",
    saveChanges: "Guardar alterações",
    noEntries: "Sem memórias ainda.",
    edit: "Editar",
    delete: "Eliminar",
    dayA: "Memória A",
    dayB: "Memória B",
    pickDay: "Escolhe uma memória",
    noEntriesYet: "Sem registos ainda",
    change: "alterar",
    language: "Idioma",
    theme: "Tema",
    changelog: "Novidades",
    exportZip: "Exportar fotos (.zip)",
    exporting: "A preparar exportação…",
    onThisDay: (age) => `${age} neste dia`,
    filterAll: "Tudo",
    settingsTitle: "Definições",
    themeLight: "Claro",
    themeDark: "Escuro",
    themeWarm: "Quente",
  },
};

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── helpers ──────────────────────────────────────────────────────────────────

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
  { color: "#4A90D9", bg: "#EBF4FF" },
  { color: "#E87BAA", bg: "#FFF0F6" },
  { color: "#6DBF87", bg: "#EDFAF2" },
  { color: "#F5A623", bg: "#FFF8EC" },
  { color: "#9B6BE8", bg: "#F5EFFF" },
  { color: "#E8706B", bg: "#FFF0EF" },
];

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];

const THEMES = {
  light: { bg: "#FAF8F5", card: "#ffffff", border: "#EDEAE4", text: "#1a1a1a", sub: "#999", navBg: "#FAF8F5" },
  warm:  { bg: "#FDF6EE", card: "#fffaf4", border: "#F0E4D0", text: "#2a1a0a", sub: "#a08060", navBg: "#FDF6EE" },
  dark:  { bg: "#141414", card: "#1e1e1e", border: "#2a2a2a", text: "#f0f0f0", sub: "#666", navBg: "#141414" },
};

const CHANGELOG = [
  { version: "1.3", date: "2025", notes: "Settings: language, theme, export. Redesigned timeline wall. Entry detail view. Multiple entries per day." },
  { version: "1.2", date: "2025", notes: "Edit and delete entries. Improved age display: months+days and years+months." },
  { version: "1.1", date: "2025", notes: "Dynamic profiles with name and birth date. Compare view." },
  { version: "1.0", date: "2025", notes: "Initial release. Photo log, timeline, two profiles." },
];

// ── storage ───────────────────────────────────────────────────────────────────

const loadState = () => {
  try {
    const raw = localStorage.getItem("zommy_v4");
    if (raw) return JSON.parse(raw);
    const v3 = localStorage.getItem("zommy_v3") || localStorage.getItem("zommy_v2");
    if (v3) {
      const old = JSON.parse(v3);
      return { ...old, lang: "en", theme: "light" };
    }
    return { profiles: [], entries: {}, lang: "en", theme: "light" };
  } catch { return { profiles: [], entries: {}, lang: "en", theme: "light" }; }
};

const persist = (state) => {
  try { localStorage.setItem("zommy_v4", JSON.stringify(state)); } catch {}
};

// ── nav config ────────────────────────────────────────────────────────────────

const NAV = [
  { id: "home",     icon: "🏠", color: "#4A90D9" },
  { id: "log",      icon: "📷", color: "#E87BAA" },
  { id: "timeline", icon: "🎞", color: "#6DBF87" },
  { id: "compare",  icon: "⟷",  color: "#F5A623" },
  { id: "settings", icon: "⚙️", color: "#9B6BE8" },
];

// ── component ─────────────────────────────────────────────────────────────────

export default function Zommy() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);

  const [logDate, setLogDate] = useState(today());
  const [logNote, setLogNote] = useState("");
  const [logPhoto, setLogPhoto] = useState(null);
  const [logPreview, setLogPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef();

  const [expandedEntry, setExpandedEntry] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [newEmoji, setNewEmoji] = useState("👶");
  const [newPalette, setNewPalette] = useState(0);

  const [compareId, setCompareId] = useState(null);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  const [showChangelog, setShowChangelog] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  const t = LANGS[state.lang] || LANGS.en;
  const theme = THEMES[state.theme] || THEMES.light;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const update = (s) => { setState(s); persist(s); };

  const active = state.profiles.find((p) => p.id === activeId);
  const activeEntries = activeId ? (state.entries[activeId] || []) : [];
  const sortedEntries = useMemo(() => [...activeEntries].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.id - a.id;
  }), [activeEntries]);

  // available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set(sortedEntries.map((e) => e.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [sortedEntries]);

  const filteredEntries = useMemo(() => {
    if (!filterMonth) return sortedEntries;
    return sortedEntries.filter((e) => e.date.startsWith(filterMonth));
  }, [sortedEntries, filterMonth]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { setLogPhoto(ev.target.result); setLogPreview(ev.target.result); };
    r.readAsDataURL(file);
  };

  const saveEntry = () => {
    if (!logPhoto) { showToast("Add a photo first 📷"); return; }
    const prev = state.entries[activeId] || [];
    let updated;
    if (editingId) {
      updated = prev.map((e) => e.id === editingId ? { ...e, date: logDate, photo: logPhoto, note: logNote } : e);
    } else {
      updated = [...prev, { date: logDate, photo: logPhoto, note: logNote, id: Date.now() }];
    }
    updated.sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id);
    update({ ...state, entries: { ...state.entries, [activeId]: updated } });
    setLogPhoto(null); setLogPreview(null); setLogNote(""); setLogDate(today()); setEditingId(null);
    showToast(editingId ? "Updated ✓" : "Saved ✓");
    setView("timeline");
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setLogDate(entry.date);
    setLogNote(entry.note || "");
    setLogPhoto(entry.photo);
    setLogPreview(entry.photo);
    setExpandedEntry(null);
    setView("log");
  };

  const deleteEntry = (entryId) => {
    const prev = state.entries[activeId] || [];
    update({ ...state, entries: { ...state.entries, [activeId]: prev.filter((e) => e.id !== entryId) } });
    setExpandedEntry(null);
    showToast("Deleted");
  };

  const createProfile = () => {
    if (!newName.trim()) { showToast("Add a name"); return; }
    if (!newBirth) { showToast("Add a birth date"); return; }
    const id = `child_${Date.now()}`;
    const pal = PALETTE[newPalette];
    update({ ...state, profiles: [...state.profiles, { id, name: newName.trim(), birthdate: newBirth, emoji: newEmoji, color: pal.color, bg: pal.bg }], entries: { ...state.entries, [id]: [] } });
    setNewName(""); setNewBirth(""); setNewEmoji("👶"); setNewPalette(0); setShowForm(false);
    showToast(`${newName.trim()} added 🎉`);
  };

  const goLog = (id) => {
    setActiveId(id); setEditingId(null);
    setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null);
    setView("log");
  };

  const handleExport = async () => {
    const allEntries = Object.entries(state.entries).flatMap(([pid, entries]) => {
      const profile = state.profiles.find((p) => p.id === pid);
      return entries.map((e) => ({ ...e, profileName: profile?.name || pid }));
    });
    if (allEntries.length === 0) { showToast("No photos to export"); return; }
    setExportingZip(true);

    try {
      // Build a simple HTML page with all images for download
      const lines = allEntries.map((e) =>
        `<div style="margin:20px;text-align:center">
          <img src="${e.photo}" style="max-width:400px;border-radius:12px" /><br/>
          <b>${e.profileName}</b> — ${e.date}${e.note ? `<br/><i>${e.note}</i>` : ""}
        </div>`
      ).join("\n");
      const html = `<html><body style="background:#faf8f5;font-family:sans-serif">${lines}</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "zommy-export.html";
      a.click(); URL.revokeObjectURL(url);
      showToast("Export ready ✓");
    } catch {
      showToast("Export failed");
    }
    setExportingZip(false);
  };

  const monthLabel = (ym) => {
    const [y, m] = ym.split("-");
    const months = state.lang === "pt" ? MONTHS_PT : MONTHS_EN;
    return `${months[parseInt(m, 10) - 1]} ${y}`;
  };

  // ── styles (theme-aware) ──────────────────────────────────────────────────

  const S = {
    root: { fontFamily: "'DM Sans',sans-serif", background: theme.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" },
    hdr: { background: theme.navBg, borderBottom: `1px solid ${theme.border}`, padding: "13px 20px", position: "sticky", top: 0, zIndex: 10 },
    hdrIn: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    logoZ: { fontFamily: "'Lora',serif", fontStyle: "italic", fontSize: 26, color: theme.text, lineHeight: 1 },
    logoR: { fontFamily: "'Lora',serif", fontSize: 22, color: theme.text, fontWeight: 400, letterSpacing: "-0.5px" },
    back: { background: "none", border: "none", fontSize: 14, color: theme.sub, fontFamily: "'DM Sans',sans-serif", padding: "4px 0", cursor: "pointer" },
    main: { flex: 1, paddingBottom: 80, overflowY: "auto" },
    toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "10px 22px", borderRadius: 100, fontSize: 14, zIndex: 200, whiteSpace: "nowrap" },

    home: { padding: "24px 20px 20px" },
    tagline: { fontFamily: "'Lora',serif", fontStyle: "italic", color: theme.sub, fontSize: 15, marginBottom: 24 },
    emptyHome: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 20px" },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
    card: { background: theme.card, borderRadius: 16, border: `1.5px solid`, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
    avt: { width: 68, height: 68, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avtImg: { width: "100%", height: "100%", objectFit: "cover" },
    pName: { fontFamily: "'Lora',serif", fontSize: 17, color: theme.text, fontWeight: 600, marginTop: 2 },
    pCount: { fontSize: 12, color: theme.sub },
    pActions: { display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 6 },
    btn1: { padding: "9px 14px", borderRadius: 100, border: "none", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center" },
    btn2: { padding: "9px 14px", borderRadius: 100, border: "1.5px solid", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center" },

    addBtn: { width: "100%", padding: "13px", background: theme.card, border: `1.5px dashed ${theme.border}`, borderRadius: 12, fontSize: 14, color: theme.sub, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 10 },
    cmpBtn: { width: "100%", padding: "13px", background: theme.card, border: `1.5px solid ${theme.border}`, borderRadius: 12, fontSize: 14, color: theme.sub, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

    formCard: { background: theme.card, border: `1.5px solid ${theme.border}`, borderRadius: 16, padding: "18px 16px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 },
    formTitle: { fontFamily: "'Lora',serif", fontSize: 18, color: theme.text, fontWeight: 600 },
    emojiRow: { display: "flex", gap: 8 },
    emojiBtn: { width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 19, display: "flex", alignItems: "center", justifyContent: "center" },
    palRow: { display: "flex", gap: 10 },
    palDot: { width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer" },
    saveBtn: { flex: 1, padding: "13px", borderRadius: 10, border: "none", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
    cancelBtn: { flex: 1, padding: "13px", background: theme.state === "dark" ? "#2a2a2a" : "#f0ede8", border: "none", borderRadius: 10, fontSize: 15, color: theme.sub, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

    sec: { padding: "22px 20px" },
    secHead: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 },
    secTitle: { fontFamily: "'Lora',serif", fontSize: 20, color: theme.text, fontWeight: 600 },
    tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 },
    tab: { padding: "7px 15px", borderRadius: 100, border: "1.5px solid", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 },
    lbl: { fontSize: 12, color: theme.sub, letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: 500, marginBottom: -5 },
    inp: { padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${theme.border}`, fontSize: 15, background: theme.card, color: theme.text, fontFamily: "'DM Sans',sans-serif", width: "100%" },
    form: { display: "flex", flexDirection: "column", gap: 14 },
    drop: { border: `1.5px dashed ${theme.border}`, borderRadius: 12, padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", background: theme.state === "dark" ? "#1a1a1a" : "#f7f5f2" },
    prevWrap: { position: "relative", borderRadius: 12, overflow: "hidden" },
    prev: { width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, display: "block" },
    remBtn: { position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.5)", color: "#fff", border: "none", borderRadius: 100, padding: "6px 13px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
    ta: { padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${theme.border}`, fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: theme.text, background: theme.card, resize: "none", lineHeight: 1.6, width: "100%" },

    // timeline wall
    filterRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14, scrollbarWidth: "none" },
    filterChip: { padding: "5px 12px", borderRadius: 100, border: "1.5px solid", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 },
    photoWall: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 },
    wallPhoto: { aspectRatio: "1", objectFit: "cover", width: "100%", display: "block", cursor: "pointer" },
    empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", color: theme.sub, fontSize: 15 },

    // entry detail overlay
    overlay: { position: "fixed", inset: 0, background: "#000", zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto" },
    overlayImg: { width: "100%", maxHeight: "65vh", objectFit: "cover", display: "block" },
    overlayBody: { flex: 1, padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: 10 },
    overlayDate: { fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 600, color: "#fff" },
    overlayAge: { fontSize: 14, color: "#aaa", fontStyle: "italic" },
    overlayNote: { fontSize: 16, color: "#ddd", lineHeight: 1.6, marginTop: 4 },
    overlayActions: { display: "flex", gap: 10, marginTop: "auto", paddingTop: 20 },
    editBtn: { flex: 1, padding: "13px", background: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", color: "#1a1a1a" },
    delBtn: { flex: 1, padding: "13px", background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", color: "#ff6b6b" },
    overlayClose: { position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 51 },

    // compare
    cmpGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    cmpCol: { display: "flex", flexDirection: "column", gap: 8 },
    cmpLbl: { fontSize: 11, color: theme.sub, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 500 },
    cmpCard: { background: theme.card, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)" },
    cmpPhoto: { width: "100%", height: 148, objectFit: "cover", display: "block" },
    chgBtn: { background: "none", border: "none", color: theme.sub, fontSize: 12, cursor: "pointer", padding: "4px 10px 8px", fontFamily: "'DM Sans',sans-serif" },
    cmpPicker: { background: theme.card, borderRadius: 12, padding: 10, minHeight: 150, border: `1.5px dashed ${theme.border}` },
    cmpList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" },
    cmpItem: { display: "flex", alignItems: "center", gap: 8, background: theme.bg, border: "1.5px solid", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" },
    cmpThumb: { width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 },

    // settings
    settingsSection: { marginBottom: 28 },
    settingsSectionTitle: { fontSize: 12, color: theme.sub, letterSpacing: "0.7px", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 },
    settingsRow: { background: theme.card, borderRadius: 12, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${theme.border}` },
    settingsLabel: { fontSize: 15, color: theme.text, fontWeight: 500 },
    settingsValue: { fontSize: 14, color: theme.sub },
    segmented: { display: "flex", gap: 6 },
    segBtn: { padding: "7px 14px", borderRadius: 100, border: "1.5px solid", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 },
    changelogItem: { background: theme.card, borderRadius: 12, padding: "14px 16px", marginBottom: 8, border: `1px solid ${theme.border}` },
    changelogVersion: { fontFamily: "'Lora',serif", fontSize: 15, fontWeight: 600, color: theme.text },
    changelogNotes: { fontSize: 13, color: theme.sub, marginTop: 4, lineHeight: 1.5 },
    exportBtn: { width: "100%", padding: "14px", background: "#1a1a1a", border: "none", borderRadius: 12, fontSize: 15, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 },

    // nav
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: theme.navBg, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-around", padding: "6px 0 10px", zIndex: 10 },
    navItem: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: "4px 10px", gap: 3, borderRadius: 10, transition: "all 0.15s" },
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .f{animation:fu 0.3s ease forwards}
        @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .b{transition:all .15s;cursor:pointer}
        .b:hover{opacity:.82}
        .b:active{transform:scale(.96)}
        input:focus,textarea:focus{outline:none}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}
        .filterRow::-webkit-scrollbar{display:none}
        .wallPhoto{transition:opacity .15s}
        .wallPhoto:hover{opacity:.85}
      `}</style>

      {toast && <div style={S.toast}>{toast}</div>}

      {/* ENTRY DETAIL OVERLAY */}
      {expandedEntry && (() => {
        const entry = expandedEntry;
        const profile = state.profiles.find((p) => (state.entries[p.id] || []).some((e) => e.id === entry.id)) || active;
        return (
          <div style={S.overlay}>
            <div style={{ position: "relative" }}>
              <img src={entry.photo} alt={entry.date} style={S.overlayImg} />
              <button className="b" style={S.overlayClose} onClick={() => setExpandedEntry(null)}>×</button>
            </div>
            <div style={S.overlayBody}>
              <div style={{ ...S.overlayDate, color: profile?.color || "#fff" }}>{formatDate(entry.date, state.lang)}</div>
              {profile && getAgeFull(profile.birthdate, entry.date) && (
                <div style={S.overlayAge}>{getAgeFull(profile.birthdate, entry.date)}</div>
              )}
              {entry.note && <div style={S.overlayNote}>{entry.note}</div>}
              <div style={S.overlayActions}>
                <button className="b" style={S.editBtn} onClick={() => startEdit(entry)}>{t.edit}</button>
                <button className="b" style={S.delBtn} onClick={() => deleteEntry(entry.id)}>{t.delete}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HEADER */}
      <header style={S.hdr}>
        <div style={S.hdrIn}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={S.logoZ}>z</span><span style={S.logoR}>ommy</span>
          </div>
          {view !== "home" && (
            <button className="b" onClick={() => setView("home")} style={S.back}>← back</button>
          )}
        </div>
      </header>

      <main style={S.main}>

        {/* HOME */}
        {view === "home" && (
          <div className="f" style={S.home}>
            <p style={S.tagline}>{t.tagline}</p>
            {state.profiles.length === 0 && !showForm && (
              <div style={S.emptyHome}>
                <span style={{ fontSize: 46 }}>🌱</span>
                <p style={{ color: theme.sub, fontSize: 15, textAlign: "center", lineHeight: 1.7, whiteSpace: "pre-line" }}>{t.noChildren}</p>
              </div>
            )}
            <div style={S.grid}>
              {state.profiles.map((p) => {
                const pe = state.entries[p.id] || [];
                const latest = [...pe].sort((a, b) => b.date.localeCompare(a.date))[0];
                const age = getAgeFull(p.birthdate, today());
                return (
                  <div key={p.id} className="b" style={{ ...S.card, borderColor: p.color + "33" }}
                    onClick={() => { setActiveId(p.id); setView("timeline"); }}>
                    <div style={{ ...S.avt, background: p.bg }}>
                      {latest?.photo ? <img src={latest.photo} alt={p.name} style={S.avtImg} /> : <span style={{ fontSize: 32 }}>{p.emoji}</span>}
                    </div>
                    <div style={S.pName}>{p.name}</div>
                    {age && <div style={{ fontSize: 12, fontWeight: 500, color: p.color }}>{age}</div>}
                    <div style={S.pCount}>{pe.length} {pe.length === 1 ? t.entry : t.entries}</div>
                  </div>
                );
              })}
            </div>
            {showForm ? (
              <div className="f" style={S.formCard}>
                <div style={S.formTitle}>{t.newChild}</div>
                <label style={S.lbl}>{t.name}</label>
                <input type="text" placeholder="e.g. Tommy" value={newName} onChange={(e) => setNewName(e.target.value)} style={S.inp} />
                <label style={S.lbl}>{t.birthDate}</label>
                <input type="date" value={newBirth} max={today()} onChange={(e) => setNewBirth(e.target.value)} style={S.inp} />
                <label style={S.lbl}>{t.emoji}</label>
                <div style={S.emojiRow}>{EMOJIS.map((em) => (
                  <button key={em} className="b" onClick={() => setNewEmoji(em)} style={{ ...S.emojiBtn, background: newEmoji === em ? "#1a1a1a" : "#f0ede8" }}>{em}</button>
                ))}</div>
                <label style={S.lbl}>{t.colour}</label>
                <div style={S.palRow}>{PALETTE.map((p, i) => (
                  <button key={i} className="b" onClick={() => setNewPalette(i)} style={{ ...S.palDot, background: p.color, outline: newPalette === i ? `3px solid ${p.color}` : "none", outlineOffset: 2 }} />
                ))}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="b" style={{ ...S.saveBtn, background: "#1a1a1a" }} onClick={createProfile}>{t.addChildBtn}</button>
                  <button className="b" style={S.cancelBtn} onClick={() => setShowForm(false)}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <button className="b" style={S.addBtn} onClick={() => setShowForm(true)}>{t.addChild}</button>
            )}
            {state.profiles.length >= 2 && (
              <button className="b" style={S.cmpBtn} onClick={() => { setCompareId(state.profiles[0].id); setCompareA(null); setCompareB(null); setView("compare"); }}>{t.compareDays}</button>
            )}
          </div>
        )}

        {/* LOG / EDIT */}
        {view === "log" && (
          <div className="f" style={S.sec}>
            {/* profile picker if none selected */}
            {!active && (
              <div style={{ marginBottom: 20 }}>
                <div style={S.secTitle}>Who is this memory for?</div>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {state.profiles.map((p) => (
                    <button key={p.id} className="b" style={{ ...S.btn1, background: p.color, flex: 1 }} onClick={() => setActiveId(p.id)}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {active && (
              <>
                <div style={S.secHead}>
                  <span style={{ fontSize: 24 }}>{active.emoji}</span>
                  <div>
                    <h2 style={S.secTitle}>{editingId ? t.editEntry : t.logFor(active.name)}</h2>
                    {getAgeFull(active.birthdate, logDate) && (
                      <div style={{ color: active.color, fontSize: 14, marginTop: 3, fontStyle: "italic" }}>{t.onThisDay(getAgeFull(active.birthdate, logDate))}</div>
                    )}
                  </div>
                </div>
                {state.profiles.length > 1 && !editingId && (
                  <div style={{ ...S.tabs, marginBottom: 20 }}>
                    {state.profiles.map((p) => (
                      <button key={p.id} className="b" onClick={() => setActiveId(p.id)}
                        style={{ ...S.tab, background: activeId === p.id ? p.color : "transparent", color: activeId === p.id ? "#fff" : theme.sub, borderColor: activeId === p.id ? p.color : theme.border }}>
                        {p.emoji} {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <div style={S.form}>
                  <label style={S.lbl}>{t.date}</label>
                  <input type="date" value={logDate} max={today()} onChange={(e) => setLogDate(e.target.value)} style={S.inp} />
                  <label style={S.lbl}>{t.photo}</label>
                  {logPreview ? (
                    <div style={S.prevWrap}>
                      <img src={logPreview} alt="preview" style={S.prev} />
                      <button className="b" style={S.remBtn} onClick={() => { setLogPhoto(null); setLogPreview(null); }}>remove</button>
                    </div>
                  ) : (
                    <div className="b" style={S.drop} onClick={() => fileRef.current.click()}>
                      <span style={{ fontSize: 30 }}>📷</span>
                      <span style={{ color: theme.sub, fontSize: 14, marginTop: 6 }}>{t.tapPhoto}</span>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                    </div>
                  )}
                  <label style={S.lbl}>{t.note} <span style={{ color: theme.sub, fontWeight: 300, textTransform: "none", letterSpacing: 0 }}>{t.noteOptional}</span></label>
                  <textarea value={logNote} onChange={(e) => setLogNote(e.target.value)}
                    placeholder="Said a new word. Laughed at the dog. Wouldn't eat dinner again."
                    style={S.ta} rows={3} />
                  <button className="b" style={{ ...S.saveBtn, background: active.color }} onClick={saveEntry}>
                    {editingId ? t.saveChanges : t.saveEntry}
                  </button>
                  {editingId && (
                    <button className="b" style={S.cancelBtn} onClick={() => { setEditingId(null); setView("timeline"); }}>{t.cancel}</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TIMELINE */}
        {view === "timeline" && (
          <div className="f" style={S.sec}>
            <div style={S.secHead}>
              <div style={{ flex: 1 }}>
                <div style={S.tabs}>
                  {state.profiles.map((p) => (
                    <button key={p.id} className="b" onClick={() => { setActiveId(p.id); setFilterMonth(null); }}
                      style={{ ...S.tab, background: activeId === p.id ? p.color : "transparent", color: activeId === p.id ? "#fff" : theme.sub, borderColor: activeId === p.id ? p.color : theme.border }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* month filter */}
            {availableMonths.length > 1 && (
              <div className="filterRow" style={S.filterRow}>
                <button className="b" onClick={() => setFilterMonth(null)}
                  style={{ ...S.filterChip, background: !filterMonth ? (active?.color || "#1a1a1a") : "transparent", color: !filterMonth ? "#fff" : theme.sub, borderColor: !filterMonth ? (active?.color || "#1a1a1a") : theme.border }}>
                  {t.filterAll}
                </button>
                {availableMonths.map((ym) => (
                  <button key={ym} className="b" onClick={() => setFilterMonth(ym === filterMonth ? null : ym)}
                    style={{ ...S.filterChip, background: filterMonth === ym ? (active?.color || "#1a1a1a") : "transparent", color: filterMonth === ym ? "#fff" : theme.sub, borderColor: filterMonth === ym ? (active?.color || "#1a1a1a") : theme.border }}>
                    {monthLabel(ym)}
                  </button>
                ))}
              </div>
            )}

            {filteredEntries.length === 0 ? (
              <div style={S.empty}><span style={{ fontSize: 36 }}>📷</span><p>{t.noEntries}</p></div>
            ) : (
              <div style={S.photoWall}>
                {filteredEntries.map((entry) => (
                  <img key={entry.id} src={entry.photo} alt={entry.date}
                    className="wallPhoto b"
                    style={S.wallPhoto}
                    onClick={() => setExpandedEntry(entry)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPARE */}
        {view === "compare" && (
          <div className="f" style={S.sec}>
            <h2 style={{ ...S.secTitle, marginBottom: 14 }}>{t.compare}</h2>
            <div style={S.tabs}>
              {state.profiles.map((p) => (
                <button key={p.id} className="b" onClick={() => { setCompareId(p.id); setCompareA(null); setCompareB(null); }}
                  style={{ ...S.tab, background: compareId === p.id ? p.color : "transparent", color: compareId === p.id ? "#fff" : theme.sub, borderColor: compareId === p.id ? p.color : theme.border }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
            {(() => {
              const cp = state.profiles.find((p) => p.id === compareId);
              const cpe = compareId ? [...(state.entries[compareId] || [])].sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id) : [];
              return (
                <div style={{ ...S.cmpGrid, marginTop: 18 }}>
                  {[{ sel: compareA, set: setCompareA, lbl: t.dayA }, { sel: compareB, set: setCompareB, lbl: t.dayB }].map(({ sel, set, lbl }) => (
                    <div key={lbl} style={S.cmpCol}>
                      <div style={S.cmpLbl}>{lbl}</div>
                      {sel ? (
                        <div style={S.cmpCard}>
                          <img src={sel.photo} alt={sel.date} style={S.cmpPhoto} />
                          <div style={{ padding: "8px 10px 4px" }}>
                            <div style={{ fontFamily: "'Lora',serif", fontSize: 13, fontWeight: 600, color: cp?.color }}>{formatDate(sel.date, state.lang)}</div>
                            {cp && getAgeFull(cp.birthdate, sel.date) && (
                              <div style={{ fontSize: 11, color: theme.sub, fontStyle: "italic", marginTop: 2 }}>{getAgeFull(cp.birthdate, sel.date)}</div>
                            )}
                            {sel.note && <div style={{ fontSize: 12, color: theme.sub, marginTop: 3, lineHeight: 1.4 }}>{sel.note}</div>}
                          </div>
                          <button className="b" style={S.chgBtn} onClick={() => set(null)}>{t.change}</button>
                        </div>
                      ) : (
                        <div style={S.cmpPicker}>
                          <p style={{ color: theme.sub, fontSize: 13, marginBottom: 8 }}>{t.pickDay}</p>
                          {cpe.length === 0 && <p style={{ color: theme.sub, fontSize: 12 }}>{t.noEntriesYet}</p>}
                          <div style={S.cmpList}>
                            {cpe.map((e) => (
                              <button key={e.id} className="b" onClick={() => set(e)} style={{ ...S.cmpItem, borderColor: (cp?.color || "#ccc") + "33" }}>
                                <img src={e.photo} alt={e.date} style={S.cmpThumb} />
                                <span style={{ fontSize: 12, color: theme.text, textAlign: "left", lineHeight: 1.4 }}>
                                  {formatDateShort(e.date, state.lang)}
                                  {cp && getAge(cp.birthdate, e.date) && (
                                    <span style={{ display: "block", color: cp.color, fontSize: 11, fontWeight: 500 }}>{getAge(cp.birthdate, e.date)}</span>
                                  )}
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

        {/* SETTINGS */}
        {view === "settings" && (
          <div className="f" style={S.sec}>
            <h2 style={{ ...S.secTitle, marginBottom: 24 }}>{t.settingsTitle}</h2>

            <div style={S.settingsSection}>
              <div style={S.settingsSectionTitle}>{t.language}</div>
              <div style={S.settingsRow}>
                <span style={S.settingsLabel}>{t.language}</span>
                <div style={S.segmented}>
                  {["en", "pt"].map((l) => (
                    <button key={l} className="b" onClick={() => update({ ...state, lang: l })}
                      style={{ ...S.segBtn, background: state.lang === l ? "#1a1a1a" : "transparent", color: state.lang === l ? "#fff" : theme.sub, borderColor: state.lang === l ? "#1a1a1a" : theme.border }}>
                      {l === "en" ? "🇬🇧 EN" : "🇵🇹 PT"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={S.settingsSection}>
              <div style={S.settingsSectionTitle}>{t.theme}</div>
              <div style={S.settingsRow}>
                <span style={S.settingsLabel}>{t.theme}</span>
                <div style={S.segmented}>
                  {[["light", t.themeLight, "☀️"], ["warm", t.themeWarm, "🍂"], ["dark", t.themeDark, "🌙"]].map(([id, label, icon]) => (
                    <button key={id} className="b" onClick={() => update({ ...state, theme: id })}
                      style={{ ...S.segBtn, background: state.theme === id ? "#1a1a1a" : "transparent", color: state.theme === id ? "#fff" : theme.sub, borderColor: state.theme === id ? "#1a1a1a" : theme.border }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={S.settingsSection}>
              <div style={S.settingsSectionTitle}>{t.exportZip}</div>
              <button className="b" style={S.exportBtn} onClick={handleExport} disabled={exportingZip}>
                {exportingZip ? t.exporting : `📦 ${t.exportZip}`}
              </button>
              <p style={{ fontSize: 12, color: theme.sub, marginTop: 8, lineHeight: 1.5 }}>
                Exports all photos and notes as an HTML file you can open in any browser.
              </p>
            </div>

            <div style={S.settingsSection}>
              <div style={S.settingsSectionTitle}>{t.changelog}</div>
              {CHANGELOG.map((c) => (
                <div key={c.version} style={S.changelogItem}>
                  <div style={S.changelogVersion}>v{c.version} <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: theme.sub, fontWeight: 400 }}>— {c.date}</span></div>
                  <div style={S.changelogNotes}>{c.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav style={S.nav}>
        {[
          { id: "home",     icon: "🏠", label: "Home",       color: "#4A90D9" },
          { id: "log",      icon: "📷", label: t.addMemory,  color: "#E87BAA" },
          { id: "timeline", icon: "🎞", label: t.timeline,   color: "#6DBF87" },
          { id: "compare",  icon: "⟷",  label: t.compare,    color: "#F5A623" },
          { id: "settings", icon: "⚙️", label: t.settings,   color: "#9B6BE8" },
        ].map((n) => {
          const isActive = view === n.id;
          return (
            <button key={n.id} className="b"
              style={{ ...S.navItem, background: isActive ? n.color + "18" : "transparent" }}
              onClick={() => {
                if (n.id === "log") {
                  if (!activeId && state.profiles.length > 0) setActiveId(state.profiles[0].id);
                  setEditingId(null); setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null);
                }
                if (n.id === "timeline" && !activeId && state.profiles.length > 0) setActiveId(state.profiles[0].id);
                if (n.id === "compare" && state.profiles.length > 0) { setCompareId(state.profiles[0].id); setCompareA(null); setCompareB(null); }
                setExpandedEntry(null);
                setView(n.id);
              }}>
              <span style={{ fontSize: 20, filter: isActive ? "none" : "grayscale(0.4)" }}>{n.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? n.color : theme.sub, marginTop: 1 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
