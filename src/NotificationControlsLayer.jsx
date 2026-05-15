import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const STORAGE_KEY = "zommy_notification_prefs_v2";
const SENT_KEY = "zommy_notification_sent_v2";

const DAYS = [
  { id: 0, en: "Sun", pt: "Dom" },
  { id: 1, en: "Mon", pt: "Seg" },
  { id: 2, en: "Tue", pt: "Ter" },
  { id: 3, en: "Wed", pt: "Qua" },
  { id: 4, en: "Thu", pt: "Qui" },
  { id: 5, en: "Fri", pt: "Sex" },
  { id: 6, en: "Sat", pt: "Sáb" },
];

const COPY = {
  en: {
    open: "Notifications",
    title: "Notification controls",
    close: "Close",
    master: "Use richer notifications",
    masterHint: "This replaces the old on/off switch with timing, type, child and quiet-day controls.",
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
    saved: "Notification preferences saved.",
    digestTitle: "This week in Zommy",
    birthdayTitle: (name, age) => `${name} is ${age} today`,
    birthdayBody: "Open Zommy and add a birthday memory.",
    onThisDayTitle: (years) => `${years} year${years === 1 ? "" : "s"} ago today`,
    onThisDayBody: (name, date) => `${name} · ${date}`,
    digestBody: (count) => `${count} memor${count === 1 ? "y" : "ies"} saved in the last 7 days.`,
  },
  pt: {
    open: "Notificações",
    title: "Controlos de notificações",
    close: "Fechar",
    master: "Usar notificações avançadas",
    masterHint: "Substitui o antigo ligar/desligar por hora, tipo, criança e dias silenciosos.",
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
    saved: "Preferências de notificações guardadas.",
    digestTitle: "Esta semana no Zommy",
    birthdayTitle: (name, age) => `${name} faz ${age} hoje`,
    birthdayBody: "Abre o Zommy e adiciona uma memória de aniversário.",
    onThisDayTitle: (years) => `Há ${years} ano${years === 1 ? "" : "s"} neste dia`,
    onThisDayBody: (name, date) => `${name} · ${date}`,
    digestBody: (count) => `${count} memórias guardadas nos últimos 7 dias.`,
  },
};

const DEFAULT_PREFS = {
  enabled: false,
  timeSlot: "morning",
  types: { onThisDay: true, birthdays: true, weeklyDigest: false },
  quietDays: [],
  childIds: {},
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const getNotificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const loadNotificationPrefs = () => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
};

const saveNotificationPrefs = (prefs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

  try {
    const legacy = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    localStorage.setItem("zommy_prefs", JSON.stringify({ ...legacy, notifications: false }));
  } catch {}
};

const readSentKeys = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SENT_KEY) || "[]")); }
  catch { return new Set(); }
};

const writeSentKeys = (keys) => {
  localStorage.setItem(SENT_KEY, JSON.stringify([...keys].slice(-700)));
};

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const formatDate = (value, lang) => new Date(`${value}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const diffYears = (from, to) => parseInt(to.slice(0, 4), 10) - parseInt(from.slice(0, 4), 10);
const sameMonthDay = (a, b) => a?.slice(5, 10) === b?.slice(5, 10);

const ageYears = (birthdate, date) => {
  const birth = new Date(`${birthdate}T12:00:00`);
  const day = new Date(`${date}T12:00:00`);
  let years = day.getFullYear() - birth.getFullYear();
  const monthDelta = day.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && day.getDate() < birth.getDate())) years -= 1;
  return Math.max(0, years);
};

const isAllowedChild = (prefs, profile) => prefs.childIds?.[profile.id] !== false;

const inSelectedWindow = (slot) => {
  const hour = new Date().getHours();
  if (slot === "morning") return hour >= 7 && hour < 11;
  if (slot === "lunch") return hour >= 12 && hour < 15;
  if (slot === "evening") return hour >= 18 && hour < 22;
  return true;
};

const entryDateValue = (value) => new Date(`${value}T12:00:00`).getTime();

const weeklyDigestCount = (entries) => {
  const cutoff = Date.now() - 7 * 86400000;
  return entries.filter((entry) => entryDateValue(entry.created_at?.slice?.(0, 10) || entry.date) >= cutoff).length;
};

const buildPreview = ({ prefs, profiles, entries, copy, lang }) => {
  const allowedProfiles = profiles.filter((profile) => isAllowedChild(prefs, profile));
  const target = today();
  const anniversary = entries.find((entry) => {
    const profile = allowedProfiles.find((item) => item.id === entry.profile_id);
    return profile && sameMonthDay(entry.date, target) && diffYears(entry.date, target) > 0;
  });

  if (prefs.types?.onThisDay && anniversary) {
    const profile = profiles.find((item) => item.id === anniversary.profile_id);
    return `${copy.onThisDayTitle(diffYears(anniversary.date, target))} — ${copy.onThisDayBody(profile?.name || "Tommy", formatDate(anniversary.date, lang))}`;
  }

  const exampleProfile = allowedProfiles[0] || profiles[0];
  const exampleEntry = entries.find((entry) => !exampleProfile || entry.profile_id === exampleProfile.id) || entries[0];
  const years = exampleEntry ? Math.max(1, diffYears(exampleEntry.date, target) || 2) : 2;
  const date = exampleEntry?.date || "2024-05-15";
  const name = exampleProfile?.name || "Tommy";

  if (prefs.types?.birthdays && exampleProfile?.birthdate) return copy.birthdayTitle(exampleProfile.name, Math.max(1, ageYears(exampleProfile.birthdate, target)));
  if (prefs.types?.weeklyDigest) return `${copy.digestTitle} — ${copy.digestBody(Math.max(1, weeklyDigestCount(entries) || 3))}`;
  return `${copy.onThisDayTitle(years)} — ${copy.onThisDayBody(name, formatDate(date, lang))}`;
};

async function loadUserData() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { user: null, profiles: [], entries: [] };

  const [{ data: profiles }, { data: entries }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
  ]);

  return { user, profiles: profiles || [], entries: entries || [] };
}

function NotificationScheduler() {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const prefs = loadNotificationPrefs();
      if (!prefs.enabled || getNotificationPermission() !== "granted") return;
      if (prefs.quietDays?.includes(new Date().getDay())) return;
      if (!inSelectedWindow(prefs.timeSlot)) return;

      const { profiles, entries } = await loadUserData();
      if (cancelled) return;

      const copy = getCopy();
      const lang = getPrefs().lang === "pt" ? "pt" : "en";
      const todayDate = today();
      const sentKeys = readSentKeys();
      const allowedProfiles = profiles.filter((profile) => isAllowedChild(prefs, profile));
      const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

      if (prefs.types?.onThisDay) {
        entries.forEach((entry) => {
          const profile = profileById[entry.profile_id];
          if (!profile || !isAllowedChild(prefs, profile)) return;
          const years = diffYears(entry.date, todayDate);
          if (!sameMonthDay(entry.date, todayDate) || years <= 0) return;

          const key = `on-this-day:${entry.id}:${todayDate}:${prefs.timeSlot}`;
          const legacyKey = `${entry.id}:${todayDate}:${years}`;
          if (sentKeys.has(key) || sentKeys.has(legacyKey)) return;

          new Notification(copy.onThisDayTitle(years), {
            body: copy.onThisDayBody(profile.name, formatDate(entry.date, lang)),
            tag: `zommy-${key}`,
          });
          sentKeys.add(key);
          sentKeys.add(legacyKey);
        });
      }

      if (prefs.types?.birthdays) {
        allowedProfiles.forEach((profile) => {
          if (!sameMonthDay(profile.birthdate, todayDate)) return;
          const age = ageYears(profile.birthdate, todayDate);
          if (age <= 0) return;
          const key = `birthday:${profile.id}:${todayDate}:${prefs.timeSlot}`;
          if (sentKeys.has(key)) return;
          new Notification(copy.birthdayTitle(profile.name, age), { body: copy.birthdayBody, tag: `zommy-${key}` });
          sentKeys.add(key);
        });
      }

      if (prefs.types?.weeklyDigest) {
        const day = new Date().getDay();
        const digestEntries = entries.filter((entry) => {
          const profile = profileById[entry.profile_id];
          return profile && isAllowedChild(prefs, profile);
        });
        const count = weeklyDigestCount(digestEntries);
        const key = `weekly-digest:${todayDate.slice(0, 4)}-w${Math.ceil(Number(todayDate.slice(8, 10)) / 7)}:${prefs.timeSlot}`;
        if (day === 0 && count > 0 && !sentKeys.has(key)) {
          new Notification(copy.digestTitle, { body: copy.digestBody(count), tag: `zommy-${key}` });
          sentKeys.add(key);
        }
      }

      writeSentKeys(sentKeys);
    };

    tick();
    const interval = window.setInterval(tick, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

export default function NotificationControlsLayer() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(loadNotificationPrefs);
  const [permission, setPermission] = useState(getNotificationPermission);
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [visible, setVisible] = useState(false);
  const copy = useMemo(getCopy, []);
  const lang = getPrefs().lang === "pt" ? "pt" : "en";

  const loadData = async () => {
    const { profiles: profileRows, entries: entryRows, user } = await loadUserData();
    setProfiles(profileRows);
    setEntries(entryRows);
    setVisible(Boolean(user));
  };

  useEffect(() => {
    loadData();
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadData());
    return () => {
      window.removeEventListener("focus", onFocus);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const observer = new MutationObserver(() => {
      const bodyText = document.body.innerText || "";
      const inSettings = bodyText.includes("Push notifications") || bodyText.includes("Notificações push") || bodyText.includes("Settings") || bodyText.includes("Definições");
      document.body.dataset.zommySettingsVisible = inSettings ? "1" : "0";
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [visible]);

  const updatePrefs = (next) => {
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const toggleType = (key) => updatePrefs({ ...prefs, types: { ...prefs.types, [key]: !prefs.types?.[key] } });
  const toggleQuietDay = (day) => {
    const quietDays = prefs.quietDays || [];
    updatePrefs({ ...prefs, quietDays: quietDays.includes(day) ? quietDays.filter((item) => item !== day) : [...quietDays, day] });
  };
  const toggleChild = (id) => updatePrefs({ ...prefs, childIds: { ...prefs.childIds, [id]: prefs.childIds?.[id] === false } });

  if (!visible) return <NotificationScheduler />;

  const permissionText = permission === "granted" ? copy.permissionGranted : permission === "denied" ? copy.permissionDenied : permission === "unsupported" ? copy.permissionUnsupported : copy.askPermission;
  const preview = buildPreview({ prefs, profiles, entries, copy, lang });

  return (
    <>
      <NotificationScheduler />
      <button onClick={() => { setOpen(true); loadData(); setPermission(getNotificationPermission()); }} style={{ position: "fixed", left: 16, bottom: 92, zIndex: 1090, border: "1px solid rgba(255,255,255,0.18)", background: "#111820", color: "#fff", borderRadius: 999, padding: "10px 14px", fontWeight: 900, fontSize: 13, boxShadow: "0 10px 32px rgba(0,0,0,0.28)", cursor: "pointer" }}>
        🔔 {copy.open}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto", background: "#101418", borderRadius: "26px 26px 0 0", padding: "20px 18px calc(22px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -26px 100px rgba(0,0,0,0.5)" }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 27, lineHeight: 1.12, fontWeight: 650 }}>{copy.title}</h1>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>{copy.close}</button>
            </header>

            <section style={{ display: "grid", gap: 15 }}>
              <button onClick={() => updatePrefs({ ...prefs, enabled: !prefs.enabled })} style={{ border: `1px solid ${prefs.enabled ? "#34D399" : "rgba(255,255,255,0.14)"}`, background: prefs.enabled ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.04)", color: prefs.enabled ? "#34D399" : "rgba(255,255,255,0.74)", borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{prefs.enabled ? "✓ " : ""}{copy.master}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.45, marginTop: 4 }}>{copy.masterHint}</div>
              </button>

              <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, display: "grid", gap: 10, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.54)", fontWeight: 850, letterSpacing: "0.7px", textTransform: "uppercase" }}>{copy.permission}</div>
                <button onClick={requestPermission} disabled={permission === "granted" || permission === "unsupported"} style={{ border: "1px solid rgba(255,255,255,0.14)", background: permission === "granted" ? "rgba(52,211,153,0.15)" : "transparent", color: permission === "granted" ? "#34D399" : "rgba(255,255,255,0.78)", borderRadius: 13, padding: 11, fontWeight: 850, cursor: permission === "default" ? "pointer" : "default" }}>
                  {permissionText}
                </button>
              </div>

              <label style={{ display: "grid", gap: 7, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>
                {copy.time}
                <select value={prefs.timeSlot} onChange={(event) => updatePrefs({ ...prefs, timeSlot: event.target.value })} style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 12, font: "inherit" }}>
                  <option value="morning">{copy.morning}</option>
                  <option value="lunch">{copy.lunch}</option>
                  <option value="evening">{copy.evening}</option>
                </select>
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>{copy.types}</div>
                {[
                  ["onThisDay", copy.onThisDay],
                  ["birthdays", copy.birthdays],
                  ["weeklyDigest", copy.weeklyDigest],
                ].map(([key, label]) => (
                  <button key={key} onClick={() => toggleType(key)} style={{ border: `1px solid ${prefs.types?.[key] ? "#60A5FA" : "rgba(255,255,255,0.14)"}`, background: prefs.types?.[key] ? "rgba(96,165,250,0.16)" : "transparent", color: prefs.types?.[key] ? "#60A5FA" : "rgba(255,255,255,0.72)", borderRadius: 13, padding: "11px 12px", textAlign: "left", fontWeight: 850, cursor: "pointer" }}>
                    {prefs.types?.[key] ? "✓ " : ""}{label}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>{copy.quietDays}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>{copy.quietDaysHint}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {DAYS.map((day) => {
                    const selected = prefs.quietDays?.includes(day.id);
                    return <button key={day.id} onClick={() => toggleQuietDay(day.id)} style={{ border: `1px solid ${selected ? "#FB7185" : "rgba(255,255,255,0.12)"}`, background: selected ? "rgba(251,113,133,0.15)" : "rgba(255,255,255,0.035)", color: selected ? "#FB7185" : "rgba(255,255,255,0.56)", borderRadius: 11, padding: "9px 0", fontSize: 11, fontWeight: 850, cursor: "pointer" }}>{day[lang]}</button>;
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" }}>{copy.children}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>{profiles.length ? copy.childrenHint : copy.noChildren}</div>
                </div>
                {profiles.map((profile) => {
                  const enabled = prefs.childIds?.[profile.id] !== false;
                  return (
                    <button key={profile.id} onClick={() => toggleChild(profile.id)} style={{ border: `1px solid ${enabled ? profile.color || "#34D399" : "rgba(255,255,255,0.14)"}`, background: enabled ? `${profile.color || "#34D399"}22` : "transparent", color: enabled ? profile.color || "#34D399" : "rgba(255,255,255,0.56)", borderRadius: 13, padding: "11px 12px", textAlign: "left", fontWeight: 850, cursor: "pointer" }}>
                      {enabled ? "✓ " : ""}{profile.emoji || "👶"} {profile.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, background: "linear-gradient(180deg, rgba(251,191,36,0.13), rgba(255,255,255,0.04))" }}>
                <div style={{ color: "rgba(255,255,255,0.56)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>{copy.preview}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}><span style={{ color: "rgba(255,255,255,0.55)" }}>{copy.previewPrefix}</span> “{preview}”.</div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
