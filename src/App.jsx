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
    tapPhoto: "Add a photo",
    takePhoto: "Take photo",
    uploadPhoto: "Upload photo",
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
    darkTheme: "Dark theme",
    exportZip: "Export photos",
    notifications: "Push notifications",
    notificationsOn: "On",
    notificationsOff: "Off",
    notificationsEnabled: "Push notifications on ✓",
    notificationsDisabled: "Push notifications off",
    notificationsBlocked: "Notifications are blocked in this browser",
    notificationsUnsupported: "Notifications are not supported here",
    memoryNotificationTitle: (years) => `${years} year${years !== 1 ? "s" : ""} ago today`,
    memoryNotificationBody: (name, date) => `${name ? `${name} · ` : ""}${date}`,
    onThisDay: (age) => `${age} on this day`,
    filterAll: "All",
    settingsTitle: "Settings",
    themeLight: "Light",
    themeDark: "Dark",
    loading: "Loading…",
    saving: "Saving…",
    error: "Something went wrong",
    whoFor: "Who is this memory for?",
    signInTitle: "Keep every memory private.",
    signInBody: "Sign in with Google to save your family timeline securely.",
    signInWithGoogle: "Continue with Google",
    signingIn: "Opening Google…",
    signedInAs: "Signed in as",
    signOut: "Sign out",
    signOutConfirm: "Sign out of Zommy",
    authError: "Could not sign in",
    googleProviderDisabled: "Google login is not enabled in Supabase yet.",
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
    tapPhoto: "Adicionar foto",
    takePhoto: "Tirar foto",
    uploadPhoto: "Carregar foto",
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
    darkTheme: "Tema escuro",
    exportZip: "Exportar fotos",
    notifications: "Notificações push",
    notificationsOn: "Ligado",
    notificationsOff: "Desligado",
    notificationsEnabled: "Notificações push ligadas ✓",
    notificationsDisabled: "Notificações push desligadas",
    notificationsBlocked: "As notificações estão bloqueadas neste browser",
    notificationsUnsupported: "As notificações não são suportadas aqui",
    memoryNotificationTitle: (years) => `Há ${years} ano${years !== 1 ? "s" : ""} neste dia`,
    memoryNotificationBody: (name, date) => `${name ? `${name} · ` : ""}${date}`,
    onThisDay: (age) => `${age} neste dia`,
    filterAll: "Tudo",
    settingsTitle: "Definições",
    themeLight: "Claro",
    themeDark: "Escuro",
    loading: "A carregar…",
    saving: "A guardar…",
    error: "Algo correu mal",
    whoFor: "Para quem é esta memória?",
    signInTitle: "Mantém cada memória privada.",
    signInBody: "Inicia sessão com o Google para guardar a timeline da família em segurança.",
    signInWithGoogle: "Continuar com Google",
    signingIn: "A abrir o Google…",
    signedInAs: "Sessão iniciada como",
    signOut: "Terminar sessão",
    signOutConfirm: "Terminar sessão no Zommy",
    authError: "Não foi possível iniciar sessão",
    googleProviderDisabled: "O login com Google ainda não está ativo no Supabase.",
  },
};

const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── helpers ───────────────────────────────────────────────────────────────────

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const formatDate = (d, lang) =>
  new Date(d + "T12:00:00").toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

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

const DEFAULT_PREFS = { lang: "en", theme: "dark", notifications: false };

const loadPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("zommy_prefs") || "{}") }; }
  catch { return DEFAULT_PREFS; }
};
const savePrefs = (p) => { try { localStorage.setItem("zommy_prefs", JSON.stringify(p)); } catch {} };

const notificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const readNotifiedKeys = () => {
  try { return JSON.parse(localStorage.getItem("zommy_notified_anniversaries") || "[]"); }
  catch { return []; }
};

const saveNotifiedKeys = (keys) => {
  try { localStorage.setItem("zommy_notified_anniversaries", JSON.stringify(keys)); } catch {}
};

const isExternalPhotoUrl = (value) => /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

const getPrivatePhotoUrl = async (pathOrUrl) => {
  if (!pathOrUrl || isExternalPhotoUrl(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage.from("photos").createSignedUrl(pathOrUrl, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
};

const getAuthErrorMessage = (error, t) => {
  const message = `${error?.message || ""} ${error?.error_code || ""}`.toLowerCase();

  if (message.includes("unsupported provider") || message.includes("provider is not enabled")) {
    return t.googleProviderDisabled;
  }

  return t.authError;
};

const isSameMonthDay = (date, targetDate) => date.slice(5, 10) === targetDate.slice(5, 10);

const getAnniversaryYears = (date, targetDate) => {
  if (!date || !isSameMonthDay(date, targetDate)) return 0;
  return parseInt(targetDate.slice(0, 4), 10) - parseInt(date.slice(0, 4), 10);
};

const ToggleSwitch = ({ checked, disabled = false, onClick, label, T }) => (
  <button
    type="button"
    className="b"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onClick}
    style={{
      width: "100%",
      padding: "13px 14px",
      background: checked ? "#34D399" : "transparent",
      border: `1px solid ${checked ? "#34D399" : T.border}`,
      borderRadius: 14,
      color: checked ? "#111" : T.textSub,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      fontWeight: 600,
      opacity: disabled ? 0.55 : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}
  >
    <span>{label}</span>
    <span
      aria-hidden="true"
      style={{
        width: 46,
        height: 26,
        borderRadius: 100,
        background: checked ? "rgba(17,17,17,0.2)" : T.border,
        padding: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: checked ? "#111" : T.textMuted, display: "block" }} />
    </span>
  </button>
);

// ── component ─────────────────────────────────────────────────────────────────

export default function Zommy() {
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState({});
  const [prefs, setPrefs] = useState(loadPrefs);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSaving, setAuthSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const cameraRef = useRef();

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
  const [notificationStatus, setNotificationStatus] = useState(notificationPermission);

  const t = LANGS[prefs.lang] || LANGS.en;
  const T = THEMES[prefs.theme] || THEMES.dark;
  const user = session?.user || null;
  const userName = user?.user_metadata?.full_name || user?.email || "";
  const userAvatar = user?.user_metadata?.avatar_url;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const updatePrefs = (p) => { setPrefs(p); savePrefs(p); };

  const sendDueMemoryNotifications = useCallback(() => {
    if (!prefs.notifications || notificationStatus !== "granted") return;

    const todayDate = today();
    const alreadyNotified = new Set(readNotifiedKeys());
    const nextKeys = new Set(alreadyNotified);
    const due = profiles.flatMap((profile) => (entries[profile.id] || [])
      .map((entry) => ({ entry, profile, years: getAnniversaryYears(entry.date, todayDate) }))
      .filter(({ years }) => years > 0));

    due.forEach(({ entry, profile, years }) => {
      const key = `${entry.id}:${todayDate}:${years}`;
      if (alreadyNotified.has(key)) return;

      const title = t.memoryNotificationTitle(years);
      const body = [
        t.memoryNotificationBody(profile?.name, formatDate(entry.date, prefs.lang)),
        entry.note,
      ].filter(Boolean).join(" · ");

      try {
        new Notification(title, {
          body,
          icon: entry.photo,
          image: entry.photo,
          tag: `zommy-${key}`,
        });
        nextKeys.add(key);
      } catch {}
    });

    if (nextKeys.size !== alreadyNotified.size) saveNotifiedKeys([...nextKeys].slice(-500));
  }, [entries, notificationStatus, prefs.lang, prefs.notifications, profiles, t]);

  const toggleNotifications = async () => {
    if (prefs.notifications) {
      updatePrefs({ ...prefs, notifications: false });
      showToast(t.notificationsDisabled);
      return;
    }

    if (notificationStatus === "unsupported") { showToast(t.notificationsUnsupported); return; }
    if (notificationStatus === "denied") { showToast(t.notificationsBlocked); return; }

    let permission = notificationStatus;
    if (permission !== "granted") permission = await Notification.requestPermission();
    setNotificationStatus(permission);

    if (permission === "granted") {
      updatePrefs({ ...prefs, notifications: true });
      showToast(t.notificationsEnabled);
    } else if (permission === "denied") {
      showToast(t.notificationsBlocked);
    }
  };

  const signInWithGoogle = async () => {
    setAuthSaving(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      showToast(getAuthErrorMessage(error, t));
      setAuthSaving(false);
    }
  };

  const signOut = async () => {
    setAuthSaving(true);
    await supabase.auth.signOut();
    setProfiles([]);
    setEntries({});
    setActiveId(null);
    setCompareId(null);
    setCompareA(null);
    setCompareB(null);
    setExpandedEntry(null);
    setView("home");
    setAuthSaving(false);
  };

  const loadData = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setEntries({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: pd, error: profileError }, { data: ed, error: entryError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      ]);

      if (profileError) throw profileError;
      if (entryError) throw entryError;

      const signedEntries = await Promise.all((ed || []).map(async (entry) => {
        const photoPath = entry.photo_path || entry.photo;
        return {
          ...entry,
          photo_path: photoPath,
          photo: await getPrivatePhotoUrl(photoPath),
        };
      }));

      setProfiles(pd || []);
      const grouped = {};
      for (const p of (pd || [])) grouped[p.id] = [];
      for (const e of signedEntries) { if (!grouped[e.profile_id]) grouped[e.profile_id] = []; grouped[e.profile_id].push(e); }
      setEntries(grouped);
    } catch { showToast(t.error); }
    setLoading(false);
  }, [t.error, user]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      setAuthSaving(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => { if (!authLoading) loadData(); }, [authLoading, loadData]);

  useEffect(() => { setNotificationStatus(notificationPermission()); }, []);

  useEffect(() => { if (user) sendDueMemoryNotifications(); }, [sendDueMemoryNotifications, user]);

  useEffect(() => {
    if (!user) return undefined;
    const interval = window.setInterval(sendDueMemoryNotifications, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [sendDueMemoryNotifications, user]);

  const active = profiles.find((p) => p.id === activeId);
  const activeEntries = activeId ? (entries[activeId] || []) : [];
  const sortedEntries = useMemo(() => [...activeEntries].sort((a, b) =>
    b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id), [activeEntries]);
  const availableMonths = useMemo(() => Array.from(new Set(sortedEntries.map((e) => e.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)), [sortedEntries]);
  const filteredEntries = useMemo(() => !filterMonth ? sortedEntries : sortedEntries.filter((e) => e.date.startsWith(filterMonth)), [sortedEntries, filterMonth]);

  const orderComparePair = useCallback((a, b) => {
    if (!a || !b) return [a || null, b || null];
    const byDate = a.date.localeCompare(b.date);
    const aId = Number(a.id);
    const bId = Number(b.id);
    const byId = Number.isFinite(aId) && Number.isFinite(bId) ? aId - bId : String(a.id).localeCompare(String(b.id));
    return byDate < 0 || (byDate === 0 && byId <= 0) ? [a, b] : [b, a];
  }, []);

  const pickRandomCompare = useCallback((profileId = compareId) => {
    const pool = profileId ? (entries[profileId] || []) : [];
    if (pool.length === 0) {
      setCompareA(null);
      setCompareB(null);
      return;
    }
    if (pool.length === 1) {
      setCompareA(pool[0]);
      setCompareB(null);
      return;
    }

    const firstIndex = Math.floor(Math.random() * pool.length);
    let secondIndex = Math.floor(Math.random() * (pool.length - 1));
    if (secondIndex >= firstIndex) secondIndex += 1;

    const [left, right] = orderComparePair(pool[firstIndex], pool[secondIndex]);
    setCompareA(left);
    setCompareB(right);
  }, [compareId, entries, orderComparePair]);

  useEffect(() => {
    if (view === "compare" && compareId && !compareA && !compareB) pickRandomCompare(compareId);
  }, [compareA, compareB, compareId, pickRandomCompare, view]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { setLogPhoto(ev.target.result); setLogPreview(ev.target.result); };
    r.readAsDataURL(file);
  };

  const uploadPhoto = async (dataUrl) => {
    if (!user) throw new Error("Not signed in");

    const base64 = dataUrl.split(",")[1];
    const byteArr = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const filename = `${user.id}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from("photos").upload(filename, byteArr, { contentType: "image/jpeg" });
    if (error) throw error;
    return data.path;
  };

  const saveEntry = async () => {
    if (!logPhoto) { showToast("Add a photo first 📷"); return; }
    setSaving(true);
    try {
      const photoPath = logPhoto.startsWith("data:") ? await uploadPhoto(logPhoto) : (entries[activeId] || []).find((entry) => entry.id === editingId)?.photo_path || logPhoto;
      if (editingId) {
        await supabase.from("entries").update({ date: logDate, photo_path: photoPath, note: logNote }).eq("id", editingId).eq("user_id", user.id);
      } else {
        await supabase.from("entries").insert({ id: Date.now(), user_id: user.id, profile_id: activeId, date: logDate, photo_path: photoPath, note: logNote });
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
      await supabase.from("entries").delete().eq("id", entryId).eq("user_id", user.id);
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
      await supabase.from("profiles").insert({ id, user_id: user.id, name: newName.trim(), birthdate: newBirth, emoji: newEmoji, color: pal.color, bg: pal.bg });
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
    @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html{background:#43596a}
    body{background:#43596a;overscroll-behavior:none}
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
  const footerBg = "#43596a";
  const activeFooterPill = "#3a5163";

  if (authLoading || !user) {
    return (
      <div style={{ fontFamily: font, background: T.bg, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <style>{css}</style>

        {toast && (
          <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: prefs.theme === "dark" ? "#ffffff" : "#111111", color: prefs.theme === "dark" ? "#111" : "#fff", padding: "10px 20px", borderRadius: 18, fontSize: 13, fontWeight: 500, zIndex: 300, maxWidth: "min(90vw, 420px)", textAlign: "center", lineHeight: 1.4, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            {toast}
          </div>
        )}

        <header style={{ background: T.navBg, borderBottom: `1px solid ${T.navBorder}`, padding: "18px 20px 16px", minHeight: 78, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div aria-label="ZOOMY" style={{ color: T.text, fontFamily: font, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.8px", textAlign: "center" }}>
            ZOOMY
          </div>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
          {authLoading ? (
            <div style={{ color: T.textMuted, textAlign: "center", fontFamily: fontSerif, fontStyle: "italic" }}>{t.loading}</div>
          ) : (
            <div className="f" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>
              <div style={{ width: 92, height: 92, borderRadius: 28, background: "linear-gradient(135deg, #60A5FA, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.24)" }}>
                <span style={{ fontSize: 44 }}>🔒</span>
              </div>
              <div>
                <h1 style={{ fontFamily: fontSerif, fontSize: 30, lineHeight: 1.15, color: T.text, fontWeight: 600, marginBottom: 10 }}>{t.signInTitle}</h1>
                <p style={{ color: T.textSub, fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>{t.signInBody}</p>
              </div>
              <button className="b" disabled={authSaving} onClick={signInWithGoogle}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "15px 18px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.text, color: T.bg, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: authSaving ? "wait" : "pointer", opacity: authSaving ? 0.7 : 1 }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", color: "#4285F4", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>G</span>
                {authSaving ? t.signingIn : t.signInWithGoogle}
              </button>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {["en", "pt"].map((l) => (
                  <button key={l} className="b" onClick={() => updatePrefs({ ...prefs, lang: l })}
                    style={{ padding: "9px 13px", borderRadius: 100, border: `1px solid ${prefs.lang === l ? T.text : T.border}`, background: prefs.lang === l ? T.text + "10" : "transparent", color: prefs.lang === l ? T.text : T.textSub, fontSize: 13, fontWeight: prefs.lang === l ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                    {l === "en" ? "🇬🇧 English" : "🇵🇹 Português"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, background: T.bg, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{css}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: prefs.theme === "dark" ? "#ffffff" : "#111111", color: prefs.theme === "dark" ? "#111" : "#fff", padding: "10px 20px", borderRadius: 18, fontSize: 13, fontWeight: 500, zIndex: 300, maxWidth: "min(90vw, 420px)", textAlign: "center", lineHeight: 1.4, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
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
              <img src={entry.photo} alt="" style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block", background: "#000" }} />
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
      <header style={{ background: T.navBg, borderBottom: `1px solid ${T.navBorder}`, padding: "18px 20px 16px", minHeight: 78, display: "flex", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div aria-label="ZOOMY" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", color: T.text, fontFamily: font, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.8px", textAlign: "center" }}>
          ZOOMY
        </div>
        {/* subtle active profile indicator */}
        {active && (view === "timeline" || view === "log") && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, maxWidth: 118, overflow: "hidden" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: active.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.name}</span>
          </div>
        )}
      </header>

      <main style={{ flex: 1, paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))", overflowY: "auto" }}>
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
                    onClick={() => { setCompareId(profiles[0].id); pickRandomCompare(profiles[0].id); setView("compare"); }}>
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
                            <img src={logPreview} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block", background: T.bg }} />
                            <button className="b"
                              style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: 100, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: font, backdropFilter: "blur(4px)" }}
                              onClick={() => { setLogPhoto(null); setLogPreview(null); }}>remove</button>
                          </div>
                        ) : (
                          <div
                            style={{ border: `1px dashed ${T.border}`, borderRadius: 12, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: T.card }}>
                            <span style={{ fontSize: 28 }}>📷</span>
                            <span style={{ color: T.textMuted, fontSize: 13 }}>{t.tapPhoto}</span>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                              <button type="button" className="b" onClick={() => cameraRef.current.click()}
                                style={{ padding: "12px", borderRadius: 10, border: `1px solid ${T.border}`, background: active.color + "20", color: active.color, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                                📸 {t.takePhoto}
                              </button>
                              <button type="button" className="b" onClick={() => fileRef.current.click()}
                                style={{ padding: "12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
                                🖼️ {t.uploadPhoto}
                              </button>
                            </div>
                            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
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
                        <div key={entry.id} className="wallItem b" style={{ aspectRatio: "9 / 16", overflow: "hidden", cursor: "pointer", background: T.card }}
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
                    <button key={p.id} className="b chip" onClick={() => { setCompareId(p.id); pickRandomCompare(p.id); }}
                      style={{ padding: "7px 16px", borderRadius: 100, border: `1px solid ${compareId === p.id ? p.color : T.border}`, background: compareId === p.id ? p.color + "20" : "transparent", color: compareId === p.id ? p.color : T.textSub, fontSize: 13, fontWeight: compareId === p.id ? 600 : 400, cursor: "pointer", fontFamily: font }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
                {(() => {
                  const cp = profiles.find((p) => p.id === compareId);
                  const cpe = entries[compareId] || [];
                  return (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[{ sel: compareA, lbl: t.dayA }, { sel: compareB, lbl: t.dayB }].map(({ sel, lbl }) => (
                          <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 600 }}>{lbl}</div>
                            {sel ? (
                              <div style={{ background: T.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
                                <img src={sel.photo} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                                <div style={{ padding: "10px 12px 12px" }}>
                                  <div style={{ fontFamily: fontSerif, fontSize: 13, fontWeight: 600, color: cp?.color }}>{formatDate(sel.date, prefs.lang)}</div>
                                  {cp && getAgeFull(cp.birthdate, sel.date) && <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic", marginTop: 2 }}>{getAgeFull(cp.birthdate, sel.date)}</div>}
                                  {sel.note && <div style={{ fontSize: 11, color: T.textSub, marginTop: 3, lineHeight: 1.4 }}>{sel.note}</div>}
                                </div>
                              </div>
                            ) : (
                              <div style={{ background: T.card, borderRadius: 12, padding: 12, minHeight: 150, border: `1px dashed ${T.border}` }}>
                                <p style={{ color: T.textMuted, fontSize: 12 }}>{cpe.length === 0 ? t.noEntriesYet : t.pickDay}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {cpe.length > 1 && (
                        <button className="b" onClick={() => pickRandomCompare(compareId)}
                          style={{ width: "100%", marginTop: 14, padding: "13px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.textSub, cursor: "pointer", fontFamily: font }}>
                          ⇄ {t.change}
                        </button>
                      )}
                    </>
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
                    title: t.signedInAs,
                    content: (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px solid ${T.border}`, borderRadius: 14, background: T.card }}>
                        {userAvatar ? (
                          <img src={userAvatar} alt="" referrerPolicy="no-referrer" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.text + "12", color: T.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                            {(userName || user.email || "Z").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <div style={{ color: T.text, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                          <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                        </div>
                        <button className="b" disabled={authSaving} onClick={signOut}
                          style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, fontSize: 13, fontWeight: 600, cursor: authSaving ? "wait" : "pointer", fontFamily: font }}>
                          {t.signOut}
                        </button>
                      </div>
                    ),
                  },
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
                    title: t.notifications,
                    content: (
                      <ToggleSwitch
                        checked={prefs.notifications}
                        disabled={notificationStatus === "unsupported"}
                        onClick={toggleNotifications}
                        label={prefs.notifications ? `🔔 ${t.notificationsOn}` : `🔕 ${t.notificationsOff}`}
                        T={T}
                      />
                    ),
                  },
                  {
                    title: t.theme,
                    content: (
                      <ToggleSwitch
                        checked={prefs.theme === "dark"}
                        onClick={() => updatePrefs({ ...prefs, theme: prefs.theme === "dark" ? "light" : "dark" })}
                        label={`🌙 ${t.darkTheme}`}
                        T={T}
                      />
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
              </div>
            )}

          </>
        )}
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: footerBg, borderTop: "none", boxShadow: "0 -1px 0 rgba(255,255,255,0.04), 0 -10px 30px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "12px 12px calc(18px + env(safe-area-inset-bottom, 0px))", zIndex: 10 }}>
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
              style={{ width: 40, height: 40, borderRadius: "50%", background: "transparent", border: "3px solid #17d86f", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 0 1px rgba(23,216,111,0.18), 0 8px 20px rgba(0,0,0,0.16)", marginBottom: 0, flexShrink: 0 }}
              onClick={() => {
                if (!activeId && profiles.length > 0) setActiveId(profiles[0].id);
                setEditingId(null); setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null);
                setExpandedEntry(null); setView("log");
              }}>
              <span style={{ fontSize: 28, color: "#17d86f", fontWeight: 500, lineHeight: 1, marginTop: -3 }}>+</span>
            </button>
          );
          return (
            <button key={n.id} className="b"
              style={{ width: 58, height: 40, borderRadius: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, background: isActive ? activeFooterPill : "transparent", border: "none", cursor: "pointer", fontFamily: font, padding: "4px 10px", minWidth: 48, transition: "background 0.15s" }}
              onClick={() => {
                if (n.id === "timeline" && !activeId && profiles.length > 0) setActiveId(profiles[0].id);
                if (n.id === "compare" && profiles.length > 0) { setCompareId(profiles[0].id); pickRandomCompare(profiles[0].id); }
                setExpandedEntry(null); setView(n.id);
              }}>
              <span style={{ fontSize: 24, color: isActive ? n.color : "#b6c4d0", transition: "color 0.15s", lineHeight: 1 }}>{n.icon}</span>
              <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
