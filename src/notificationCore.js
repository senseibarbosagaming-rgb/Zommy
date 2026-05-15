import { supabase } from "./supabase";

export const NOTIFICATION_PREFS_KEY = "zommy_notification_prefs_v2";
export const NOTIFICATION_SENT_KEY = "zommy_notification_sent_v2";

export const DAYS = [
  { id: 0, en: "Sun", pt: "Dom" },
  { id: 1, en: "Mon", pt: "Seg" },
  { id: 2, en: "Tue", pt: "Ter" },
  { id: 3, en: "Wed", pt: "Qua" },
  { id: 4, en: "Thu", pt: "Qui" },
  { id: 5, en: "Fri", pt: "Sex" },
  { id: 6, en: "Sat", pt: "Sáb" },
];

export const NOTIFICATION_COPY = {
  en: {
    title: "Notification controls",
    master: "Use richer notifications",
    masterHint: "Timing, type, child and quiet-day controls.",
    permission: "Browser permission",
    askPermission: "Allow notifications",
    permissionGranted: "Allowed",
    permissionDenied: "Blocked in browser",
    permissionUnsupported: "Not supported here",
    time: "Notification time",
    morning: "Morning",
    lunch: "Lunch",
    evening: "Evening",
    types: "Notification types",
    onThisDay: "On this day",
    birthdays: "Birthdays",
    weeklyDigest: "Weekly digest",
    quietDays: "Quiet days",
    quietDaysHint: "No notifications on selected days.",
    children: "Children",
    childrenHint: "Only enabled children can trigger notifications.",
    preview: "Preview",
    previewPrefix: "You’ll get:",
    noChildren: "Add a child profile before per-child controls appear.",
    digestTitle: "This week in Zommy",
    birthdayTitle: (name, age) => `${name} is ${age} today`,
    birthdayBody: "Open Zommy and add a birthday memory.",
    onThisDayTitle: (years) => `${years} year${years === 1 ? "" : "s"} ago today`,
    onThisDayBody: (name, date) => `${name} · ${date}`,
    digestBody: (count) => `${count} memor${count === 1 ? "y" : "ies"} saved in the last 7 days.`,
  },
  pt: {
    title: "Controlos de notificações",
    master: "Usar notificações avançadas",
    masterHint: "Hora, tipo, criança e dias silenciosos.",
    permission: "Permissão do browser",
    askPermission: "Permitir notificações",
    permissionGranted: "Permitidas",
    permissionDenied: "Bloqueadas no browser",
    permissionUnsupported: "Não suportadas aqui",
    time: "Hora da notificação",
    morning: "Manhã",
    lunch: "Almoço",
    evening: "Noite",
    types: "Tipos de notificação",
    onThisDay: "Neste dia",
    birthdays: "Aniversários",
    weeklyDigest: "Resumo semanal",
    quietDays: "Dias silenciosos",
    quietDaysHint: "Sem notificações nos dias selecionados.",
    children: "Crianças",
    childrenHint: "Só as crianças ativas podem gerar notificações.",
    preview: "Pré-visualização",
    previewPrefix: "Vais receber:",
    noChildren: "Adiciona um perfil antes dos controlos por criança.",
    digestTitle: "Esta semana no Zommy",
    birthdayTitle: (name, age) => `${name} faz ${age} hoje`,
    birthdayBody: "Abre o Zommy e adiciona uma memória de aniversário.",
    onThisDayTitle: (years) => `Há ${years} ano${years === 1 ? "" : "s"} neste dia`,
    onThisDayBody: (name, date) => `${name} · ${date}`,
    digestBody: (count) => `${count} memórias guardadas nos últimos 7 dias.`,
  },
};

export const DEFAULT_NOTIFICATION_PREFS = {
  enabled: false,
  timeSlot: "morning",
  types: { onThisDay: true, birthdays: true, weeklyDigest: false },
  quietDays: [],
  childIds: {},
};

export const getAppPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export const getNotificationCopy = () => NOTIFICATION_COPY[getAppPrefs().lang === "pt" ? "pt" : "en"] || NOTIFICATION_COPY.en;
export const getNotificationLang = () => getAppPrefs().lang === "pt" ? "pt" : "en";

export const loadNotificationPrefs = () => {
  try { return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) || "{}") }; }
  catch { return DEFAULT_NOTIFICATION_PREFS; }
};

export const saveNotificationPrefs = (prefs) => {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  try {
    const legacy = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    localStorage.setItem("zommy_prefs", JSON.stringify({ ...legacy, notifications: false }));
  } catch {}
};

export const getNotificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export const readSentKeys = () => {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_SENT_KEY) || "[]")); }
  catch { return new Set(); }
};

export const writeSentKeys = (keys) => {
  localStorage.setItem(NOTIFICATION_SENT_KEY, JSON.stringify([...keys].slice(-700)));
};

export const todayIso = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

export const formatNotificationDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const diffYears = (from, to) => parseInt(to.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);
export const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);

export const ageYears = (birthdate, date) => {
  const birth = new Date(`${birthdate}T12:00:00`);
  const day = new Date(`${date}T12:00:00`);
  let years = day.getFullYear() - birth.getFullYear();
  const monthDelta = day.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && day.getDate() < birth.getDate())) years -= 1;
  return Math.max(0, years);
};

export const isAllowedChild = (prefs, profile) => prefs.childIds?.[profile.id] !== false;

export const inSelectedWindow = (slot) => {
  const hour = new Date().getHours();
  if (slot === "morning") return hour >= 7 && hour < 11;
  if (slot === "lunch") return hour >= 12 && hour < 15;
  if (slot === "evening") return hour >= 18 && hour < 22;
  return true;
};

const entryDateValue = (value) => new Date(`${value}T12:00:00`).getTime();

export const weeklyDigestCount = (entries) => {
  const cutoff = Date.now() - 7 * 86400000;
  return entries.filter((entry) => entryDateValue(entry.created_at?.slice?.(0, 10) || entry.date) >= cutoff).length;
};

export const buildNotificationPreview = ({ prefs, profiles, entries, copy, lang }) => {
  const allowedProfiles = profiles.filter((profile) => isAllowedChild(prefs, profile));
  const target = todayIso();
  const anniversary = entries.find((entry) => {
    const profile = allowedProfiles.find((item) => item.id === entry.profile_id);
    return profile && sameMonthDay(entry.date, target) && diffYears(entry.date, target) > 0;
  });

  if (prefs.types?.onThisDay && anniversary) {
    const profile = profiles.find((item) => item.id === anniversary.profile_id);
    return `${copy.onThisDayTitle(diffYears(anniversary.date, target))} — ${copy.onThisDayBody(profile?.name || "Tommy", formatNotificationDate(anniversary.date, lang))}`;
  }

  const exampleProfile = allowedProfiles[0] || profiles[0];
  const exampleEntry = entries.find((entry) => !exampleProfile || entry.profile_id === exampleProfile.id) || entries[0];
  const years = exampleEntry ? Math.max(1, diffYears(exampleEntry.date, target) || 2) : 2;
  const date = exampleEntry?.date || "2024-05-15";
  const name = exampleProfile?.name || "Tommy";

  if (prefs.types?.birthdays && exampleProfile?.birthdate) return copy.birthdayTitle(exampleProfile.name, Math.max(1, ageYears(exampleProfile.birthdate, target)));
  if (prefs.types?.weeklyDigest) return `${copy.digestTitle} — ${copy.digestBody(Math.max(1, weeklyDigestCount(entries) || 3))}`;
  return `${copy.onThisDayTitle(years)} — ${copy.onThisDayBody(name, formatNotificationDate(date, lang))}`;
};

export async function loadNotificationUserData() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { user: null, profiles: [], entries: [] };

  const [{ data: profiles }, { data: entries }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at"),
    supabase.from("entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
  ]);

  return { user, profiles: profiles || [], entries: entries || [] };
}
