import { useMemo, useState } from "react";
import {
  buildNotificationPreview,
  DAYS,
  getNotificationCopy,
  getNotificationLang,
  getNotificationPermission,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "./notificationCore";

export default function NotificationSettingsPanel({ profiles = [], entries = [] }) {
  const [prefs, setPrefs] = useState(loadNotificationPrefs);
  const [permission, setPermission] = useState(getNotificationPermission);
  const copy = useMemo(getNotificationCopy, []);
  const lang = getNotificationLang();

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

  const permissionText = permission === "granted" ? copy.permissionGranted : permission === "denied" ? copy.permissionDenied : permission === "unsupported" ? copy.permissionUnsupported : copy.askPermission;
  const activeProfiles = profiles.filter((profile) => !profile.archived_at);
  const preview = buildNotificationPreview({ prefs, profiles: activeProfiles, entries, copy, lang });

  return (
    <section style={{ display: "grid", gap: 15 }}>
      <button onClick={() => updatePrefs({ ...prefs, enabled: !prefs.enabled })} style={{ border: `1px solid ${prefs.enabled ? "#34D399" : "rgba(255,255,255,0.14)"}`, background: prefs.enabled ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.04)", color: prefs.enabled ? "#34D399" : "rgba(255,255,255,0.74)", borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer" }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{prefs.enabled ? "✓ " : ""}{copy.master}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.45, marginTop: 4 }}>{copy.masterHint}</div>
      </button>

      <div style={panelStyle()}>
        <div style={eyebrowStyle()}>{copy.permission}</div>
        <button onClick={requestPermission} disabled={permission === "granted" || permission === "unsupported"} style={{ border: "1px solid rgba(255,255,255,0.14)", background: permission === "granted" ? "rgba(52,211,153,0.15)" : "transparent", color: permission === "granted" ? "#34D399" : "rgba(255,255,255,0.78)", borderRadius: 13, padding: 11, fontWeight: 850, cursor: permission === "default" ? "pointer" : "default" }}>
          {permissionText}
        </button>
      </div>

      <label style={labelStyle()}>
        {copy.time}
        <select value={prefs.timeSlot} onChange={(event) => updatePrefs({ ...prefs, timeSlot: event.target.value })} style={controlStyle()}>
          <option value="morning">{copy.morning}</option>
          <option value="lunch">{copy.lunch}</option>
          <option value="evening">{copy.evening}</option>
        </select>
      </label>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={eyebrowStyle()}>{copy.types}</div>
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
          <div style={eyebrowStyle()}>{copy.quietDays}</div>
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
          <div style={eyebrowStyle()}>{copy.children}</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>{activeProfiles.length ? copy.childrenHint : copy.noChildren}</div>
        </div>
        {activeProfiles.map((profile) => {
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
  );
}

const panelStyle = () => ({ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, display: "grid", gap: 10, background: "rgba(255,255,255,0.04)" });
const eyebrowStyle = () => ({ color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const labelStyle = () => ({ display: "grid", gap: 7, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const controlStyle = () => ({ border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 12, padding: 12, font: "inherit" });
