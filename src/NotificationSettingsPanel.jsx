import { useMemo, useState } from "react";
import { field, palette, type } from "./designSystem";
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
      <button onClick={() => updatePrefs({ ...prefs, enabled: !prefs.enabled })} style={choiceButtonStyle(prefs.enabled, palette.accent)}>
        <div style={{ fontSize: 15, fontWeight: type.weight.heading }}>{prefs.enabled ? "✓ " : ""}{copy.master}</div>
        <div style={helpTextStyle}>{copy.masterHint}</div>
      </button>

      <div style={panelStyle()}>
        <div style={eyebrowStyle()}>{copy.permission}</div>
        <button onClick={requestPermission} disabled={permission === "granted" || permission === "unsupported"} style={choiceButtonStyle(permission === "granted", palette.success)}>
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
          <button key={key} onClick={() => toggleType(key)} style={choiceButtonStyle(Boolean(prefs.types?.[key]), palette.accent)}>
            {prefs.types?.[key] ? "✓ " : ""}{label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <div style={eyebrowStyle()}>{copy.quietDays}</div>
          <div style={helpTextStyle}>{copy.quietDaysHint}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {DAYS.map((day) => {
            const selected = prefs.quietDays?.includes(day.id);
            return <button key={day.id} onClick={() => toggleQuietDay(day.id)} style={dayButtonStyle(selected)}>{day[lang]}</button>;
          })}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <div style={eyebrowStyle()}>{copy.children}</div>
          <div style={helpTextStyle}>{activeProfiles.length ? copy.childrenHint : copy.noChildren}</div>
        </div>
        {activeProfiles.map((profile) => {
          const enabled = prefs.childIds?.[profile.id] !== false;
          const color = profile.color || palette.accent;
          return (
            <button key={profile.id} onClick={() => toggleChild(profile.id)} style={choiceButtonStyle(enabled, color)}>
              {enabled ? "✓ " : ""}{profile.emoji || "👶"} {profile.name}
            </button>
          );
        })}
      </div>

      <div style={previewStyle}>
        <div style={eyebrowStyle()}>{copy.preview}</div>
        <div style={{ fontSize: 14, lineHeight: 1.55 }}><span style={{ color: palette.muted }}>{copy.previewPrefix}</span> “{preview}”.</div>
      </div>
    </section>
  );
}

const panelStyle = () => ({ border: "none", borderRadius: 20, padding: 16, display: "grid", gap: 10, background: palette.surface, boxShadow: palette.shadow });
const eyebrowStyle = () => ({ color: palette.muted, fontSize: 11, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0 });
const labelStyle = () => ({ display: "grid", gap: 7, color: palette.muted, fontSize: 11, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0 });
const helpTextStyle = { color: palette.faint, fontSize: 12, lineHeight: 1.45, marginTop: 4 };
const controlStyle = () => ({ ...field });
const choiceButtonStyle = (active, color) => ({ border: `1px solid ${active ? palette.accentLine : palette.line}`, background: active ? palette.accentSoft : palette.surface, color: active ? color : palette.muted, borderRadius: 14, minHeight: 48, padding: "11px 12px", textAlign: "left", fontWeight: type.weight.ui, cursor: "pointer" });
const dayButtonStyle = (selected) => ({ border: `1px solid ${selected ? palette.dangerSoft : palette.line}`, background: selected ? palette.dangerSoft : palette.surface, color: selected ? palette.danger : palette.muted, borderRadius: 11, minHeight: 48, padding: "9px 0", fontSize: 11, fontWeight: type.weight.ui, cursor: "pointer" });
const previewStyle = { border: "none", borderRadius: 20, padding: 16, background: palette.surface, boxShadow: palette.shadow, display: "grid", gap: 8 };
