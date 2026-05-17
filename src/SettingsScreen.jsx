import { useEffect, useMemo, useState } from "react";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import { loadNotificationPrefs, saveNotificationPrefs } from "./notificationCore";
import { supabase } from "./supabase";
import { appSurface, contentFrame, field, palette, profileTones, type } from "./designSystem";

const PALETTE = profileTones;
const EMOJIS = ["👶", "👦", "👧", "🧒", "★", "○"];
const normalizeTheme = () => "dream";

const COPY = {
  en: {
    title: "Settings",
    manageChildren: "Manage children",
    exportData: "Export data",
    deleteAccountData: "Delete account/data",
    storageUsage: "Storage usage",
    privacy: "Privacy",
    familySharing: "Family sharing",
    notificationSchedule: "Notification schedule",
    notifications: "Notifications",
    language: "Language",
    signOut: "Log out",
    signingOut: "Logging out...",
    signedOut: "Logged out.",
    account: "Account",
    comingSoon: "Coming soon",
    storageHint: "Estimated from saved memory metadata and storage objects available to the app.",
    privacyText: "Memories are private to your signed-in account. Child profiles and memories use per-user database rules.",
    familySharingText: "Family sharing needs invitations and member permissions. This is not safe to fake, so it stays explicit until built.",
    noChildren: "No children yet.",
    active: "Active",
    archived: "Archived",
    edit: "Edit",
    archive: "Archive",
    restore: "Restore",
    delete: "Delete",
    save: "Save changes",
    name: "Name",
    birthDate: "Birth date",
    emoji: "Emoji",
    color: "Colour",
    deleteChildTitle: (name) => `Delete ${name}?`,
    deleteChildBody: (name, count) => `This permanently deletes ${name}'s profile and ${count} ${count === 1 ? "memory" : "memories"}. Export first if you want a copy.`,
    typeName: (name) => `Type ${name} to confirm`,
    deleteChildConfirm: "Delete child and memories",
    archiveHint: "Archiving hides the child from normal flows but keeps memories and data.",
    exportReady: "Export ready.",
    deleteAccountTitle: "Delete all Zommy data?",
    deleteAccountBody: "This permanently deletes every child profile and memory in this account. Your Google account itself is not deleted.",
    typeDelete: "Type DELETE to confirm",
    deleteAll: "Delete all data",
    saved: "Saved.",
    error: "Something went wrong.",
    english: "English",
    portuguese: "Português",
    memories: "memories",
    permanent: "Permanent",
    openControls: "Details",
    privateAccountData: "Private account data",
    back: "Back",
    profiles: "profiles",
    enabled: "On",
    disabled: "Off",
    directExport: (entries, profiles) => `${entries} memories · ${profiles} profiles`,
  },
  pt: {
    title: "Definições",
    manageChildren: "Gerir crianças",
    exportData: "Exportar dados",
    deleteAccountData: "Eliminar conta/dados",
    storageUsage: "Uso de armazenamento",
    privacy: "Privacidade",
    familySharing: "Partilha familiar",
    notificationSchedule: "Horário de notificações",
    notifications: "Notificações",
    language: "Idioma",
    signOut: "Terminar sessão",
    signingOut: "A terminar sessão...",
    signedOut: "Sessão terminada.",
    account: "Conta",
    comingSoon: "Em breve",
    storageHint: "Estimativa com base nas memórias e objetos de armazenamento acessíveis pela app.",
    privacyText: "As memórias são privadas da tua conta. Perfis e memórias usam regras por utilizador.",
    familySharingText: "Partilha familiar precisa de convites e permissões. Não é seguro fingir isto, por isso fica explícito até ser construído.",
    noChildren: "Ainda não há crianças.",
    active: "Ativas",
    archived: "Arquivadas",
    edit: "Editar",
    archive: "Arquivar",
    restore: "Restaurar",
    delete: "Eliminar",
    save: "Guardar alterações",
    name: "Nome",
    birthDate: "Data de nascimento",
    emoji: "Emoji",
    color: "Cor",
    deleteChildTitle: (name) => `Eliminar ${name}?`,
    deleteChildBody: (name, count) => `Isto elimina permanentemente o perfil de ${name} e ${count} ${count === 1 ? "memória" : "memórias"}. Exporta primeiro se quiseres uma cópia.`,
    typeName: (name) => `Escreve ${name} para confirmar`,
    deleteChildConfirm: "Eliminar criança e memórias",
    archiveHint: "Arquivar esconde a criança dos fluxos normais, mas mantém memórias e dados.",
    exportReady: "Exportação pronta.",
    deleteAccountTitle: "Eliminar todos os dados do Zommy?",
    deleteAccountBody: "Isto elimina permanentemente todos os perfis e memórias desta conta. A tua conta Google não é eliminada.",
    typeDelete: "Escreve DELETE para confirmar",
    deleteAll: "Eliminar todos os dados",
    saved: "Guardado.",
    error: "Algo correu mal.",
    english: "English",
    portuguese: "Português",
    memories: "memórias",
    permanent: "Permanente",
    openControls: "Detalhes",
    privateAccountData: "Dados privados da conta",
    back: "Voltar",
    profiles: "perfis",
    enabled: "Ligado",
    disabled: "Desligado",
    directExport: (entries, profiles) => `${entries} memórias · ${profiles} perfis`,
  },
};

const getPrefs = () => {
  try {
    const prefs = JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
    return { ...prefs, theme: normalizeTheme(prefs.theme) };
  }
  catch { return { theme: "dream" }; }
};

const savePrefs = (prefs) => localStorage.setItem("zommy_prefs", JSON.stringify({ ...prefs, theme: normalizeTheme(prefs.theme) }));
const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const downloadJson = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const hidePrimaryScreens = () => {
  ["zommy:hide-today", "zommy:hide-timeline", "zommy:hide-settings"].forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName));
  });
};

export default function SettingsScreen() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("menu");
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmChild, setConfirmChild] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(getPrefs);
  const [notificationPrefs, setNotificationPrefs] = useState(loadNotificationPrefs);

  const copy = useMemo(getCopy, [prefs.lang]);
  const entryCountByProfile = useMemo(() => entries.reduce((map, entry) => ({ ...map, [entry.profile_id]: (map[entry.profile_id] || 0) + 1 }), {}), [entries]);
  const estimatedStorage = entries.reduce((total, entry) => total + (Array.isArray(entry.photos) && entry.photos.length ? entry.photos.length : 1) * 650000, 0);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadData = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user || null;
    setUser(currentUser);
    if (!currentUser) return;
    const [{ data: profileRows }, { data: entryRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", currentUser.id).order("created_at"),
      supabase.from("entries").select("*").eq("user_id", currentUser.id).order("date", { ascending: false }),
    ]);
    setProfiles(profileRows || []);
    setEntries(entryRows || []);
    setNotificationPrefs(loadNotificationPrefs());
  };

  useEffect(() => {
    loadData();
    const showSettings = () => { setOpen(true); setSection("menu"); loadData(); };
    const hideSettings = () => setOpen(false);
    window.addEventListener("zommy:show-settings", showSettings);
    window.addEventListener("zommy:hide-settings", hideSettings);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadData());
    return () => {
      window.removeEventListener("zommy:show-settings", showSettings);
      window.removeEventListener("zommy:hide-settings", hideSettings);
      subscription.unsubscribe();
    };
  }, []);

  if (!open || !user) return null;

  const updatePrefs = (nextPrefs) => {
    const normalizedPrefs = { ...nextPrefs, theme: normalizeTheme(nextPrefs.theme) };
    setPrefs(normalizedPrefs);
    savePrefs(normalizedPrefs);
    window.dispatchEvent(new CustomEvent("zommy:prefs-changed", { detail: normalizedPrefs }));
    showToast(copy.saved);
  };

  const updateNotificationPrefs = (nextPrefs) => {
    setNotificationPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
    showToast(copy.saved);
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      showToast(copy.error);
      setBusy(false);
      return;
    }

    setUser(null);
    setProfiles([]);
    setEntries([]);
    setEditing(null);
    setConfirmChild(null);
    setConfirmAll(false);
    setConfirmText("");
    setBusy(false);
    setOpen(false);
    hidePrimaryScreens();
  };

  const exportData = () => {
    downloadJson(`zommy-export-${today()}.json`, { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email }, profiles, entries });
    showToast(copy.exportReady);
  };

  const saveProfile = async () => {
    if (!editing?.name?.trim() || !editing?.birthdate) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name: editing.name.trim(), birthdate: editing.birthdate, emoji: editing.emoji, color: editing.color, bg: editing.bg }).eq("id", editing.id).eq("user_id", user.id);
    setBusy(false);
    if (error) { showToast(copy.error); return; }
    setEditing(null);
    await loadData();
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
    showToast(copy.saved);
  };

  const archiveProfile = async (profile, archived) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", profile.id).eq("user_id", user.id);
    setBusy(false);
    if (error) { showToast(copy.error); return; }
    await loadData();
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
    showToast(copy.saved);
  };

  const deleteProfile = async () => {
    if (!confirmChild || confirmText !== confirmChild.name) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").delete().eq("id", confirmChild.id).eq("user_id", user.id);
    setBusy(false);
    if (error) { showToast(copy.error); return; }
    setConfirmChild(null);
    setConfirmText("");
    await loadData();
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
    showToast(copy.saved);
  };

  const deleteAllData = async () => {
    if (confirmText !== "DELETE") return;
    setBusy(true);
    const entryDelete = await supabase.from("entries").delete().eq("user_id", user.id);
    const profileDelete = await supabase.from("profiles").delete().eq("user_id", user.id);
    setBusy(false);
    if (entryDelete.error || profileDelete.error) { showToast(copy.error); return; }
    setConfirmAll(false);
    setConfirmText("");
    await loadData();
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
    showToast(copy.saved);
  };

  const activeProfiles = profiles.filter((profile) => !profile.archived_at);
  const archivedProfiles = profiles.filter((profile) => profile.archived_at);
  const sectionTitle = section === "children" ? copy.manageChildren : section === "notifications" ? copy.notificationSchedule : section === "delete" ? copy.deleteAccountData : copy.title;

  const renderProfile = (profile) => (
    <article key={profile.id} style={{ ...cardStyle, opacity: profile.archived_at ? 0.72 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: profile.bg || palette.accentSoft, color: profile.color || palette.accent, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{profile.emoji || "👶"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={profileNameStyle}>{profile.name}</div>
            <div style={metaStyle}>{profile.birthdate} · {entryCountByProfile[profile.id] || 0} {copy.memories}</div>
          </div>
        </div>
        <span style={{ ...statusStyle, color: profile.archived_at ? palette.warning : palette.success }}>{profile.archived_at ? copy.archived : copy.active}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button disabled={busy} onClick={() => setEditing(profile)} style={smallButton()}>{copy.edit}</button>
        <button disabled={busy} onClick={() => archiveProfile(profile, !profile.archived_at)} style={smallButton(profile.archived_at ? palette.success : palette.warning)}>{profile.archived_at ? copy.restore : copy.archive}</button>
        <button disabled={busy} onClick={() => { setConfirmChild(profile); setConfirmText(""); }} style={smallButton(palette.danger)}>{copy.delete}</button>
      </div>
    </article>
  );

  return (
    <main style={appSurface}>
      <div style={contentFrame(112)}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>{sectionTitle}</h1>
          {section !== "menu" && <button aria-label={copy.back} onClick={() => setSection("menu")} style={ghostButton()}>←</button>}
        </header>

        {toast && <div role="status" style={toastStyle}>{toast}</div>}

        {section === "menu" && (
          <section style={{ display: "grid", gap: 12 }}>
            <SettingRow title={copy.manageChildren} meta={`${activeProfiles.length} ${copy.active.toLowerCase()}`} onClick={() => setSection("children")} />

            <SettingRow title={copy.notifications} meta={notificationPrefs.enabled ? copy.enabled : copy.disabled}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SwitchButton active={notificationPrefs.enabled} onClick={() => updateNotificationPrefs({ ...notificationPrefs, enabled: !notificationPrefs.enabled })} />
                <button onClick={() => setSection("notifications")} style={inlineButton()}>{copy.openControls}</button>
              </div>
            </SettingRow>

            <SettingRow title={copy.language} meta={prefs.lang === "pt" ? copy.portuguese : copy.english}>
              <SegmentedControl options={[["en", copy.english], ["pt", copy.portuguese]]} value={prefs.lang === "pt" ? "pt" : "en"} onChange={(lang) => updatePrefs({ ...prefs, lang })} />
            </SettingRow>

            <SettingRow title={copy.exportData} meta={copy.directExport(entries.length, profiles.length)}>
              <button onClick={exportData} style={inlineButton(palette.success)}>{copy.exportData}</button>
            </SettingRow>

            <InfoCard title={copy.storageUsage} meta={formatBytes(estimatedStorage)} body={copy.storageHint} />
            <InfoCard title={copy.privacy} meta={copy.privateAccountData} body={copy.privacyText} />
            <InfoCard title={copy.familySharing} meta={copy.comingSoon} body={copy.familySharingText} />
            <SettingRow title={copy.account} meta={user.email || ""}>
              <button disabled={busy} onClick={signOut} style={inlineButton(palette.warning)}>{busy ? copy.signingOut : copy.signOut}</button>
            </SettingRow>
            <SettingRow title={copy.deleteAccountData} meta={copy.permanent} danger onClick={() => setSection("delete")} />
          </section>
        )}

        {section === "children" && (
          <section style={{ display: "grid", gap: 14 }}>
            <p style={bodyCopyStyle}>{copy.archiveHint}</p>
            {activeProfiles.length ? activeProfiles.map(renderProfile) : <p style={emptyTextStyle}>{copy.noChildren}</p>}
            {archivedProfiles.length > 0 && <h2 style={eyebrowStyle}>{copy.archived}</h2>}
            {archivedProfiles.map(renderProfile)}
          </section>
        )}
        {section === "delete" && <Panel><p>{copy.deleteAccountBody}</p><button onClick={() => { setConfirmAll(true); setConfirmText(""); }} style={dangerButton()}>{copy.deleteAccountData}</button></Panel>}
        {section === "notifications" && <NotificationSettingsPanel profiles={profiles} entries={entries} />}

        {editing && (
          <Dialog title={copy.manageChildren} onClose={() => setEditing(null)}>
            <label style={labelStyle()}>{copy.name}<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inputStyle()} /></label>
            <label style={labelStyle()}>{copy.birthDate}<input type="date" value={editing.birthdate} max={today()} onChange={(e) => setEditing({ ...editing, birthdate: e.target.value })} style={inputStyle()} /></label>
            <div style={labelStyle()}>{copy.emoji}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{EMOJIS.map((emoji) => <button key={emoji} onClick={() => setEditing({ ...editing, emoji })} style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${editing.emoji === emoji ? palette.accentLine : palette.line}`, background: editing.emoji === emoji ? palette.accentSoft : palette.surface, fontSize: 21 }}>{emoji}</button>)}</div></div>
            <div style={labelStyle()}>{copy.color}<div style={{ display: "flex", gap: 12 }}>{PALETTE.map((item) => <button key={item.color} onClick={() => setEditing({ ...editing, color: item.color, bg: item.bg })} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: item.color, outline: editing.color === item.color ? `3px solid ${item.color}` : "none", outlineOffset: 4 }} />)}</div></div>
            <button disabled={busy} onClick={saveProfile} style={primaryButton()}>{copy.save}</button>
          </Dialog>
        )}
        {confirmChild && (
          <Dialog title={copy.deleteChildTitle(confirmChild.name)} onClose={() => setConfirmChild(null)}>
            <p style={bodyCopyStyle}>{copy.deleteChildBody(confirmChild.name, entryCountByProfile[confirmChild.id] || 0)}</p>
            <label style={labelStyle()}>{copy.typeName(confirmChild.name)}<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle()} /></label>
            <button disabled={busy || confirmText !== confirmChild.name} onClick={deleteProfile} style={dangerButton(confirmText === confirmChild.name)}>{copy.deleteChildConfirm}</button>
          </Dialog>
        )}
        {confirmAll && (
          <Dialog title={copy.deleteAccountTitle} onClose={() => setConfirmAll(false)}>
            <p style={bodyCopyStyle}>{copy.deleteAccountBody}</p>
            <label style={labelStyle()}>{copy.typeDelete}<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle()} /></label>
            <button disabled={busy || confirmText !== "DELETE"} onClick={deleteAllData} style={dangerButton(confirmText === "DELETE")}>{copy.deleteAll}</button>
          </Dialog>
        )}
      </div>
    </main>
  );
}

function Panel({ children }) {
  return <section style={{ ...cardStyle, color: palette.faint, lineHeight: 1.6 }}>{children}</section>;
}

function SettingRow({ title, meta, children, danger = false, onClick }) {
  const clickable = Boolean(onClick);
  const content = (
    <>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: danger ? palette.danger : palette.stone, fontSize: 15, fontWeight: type.weight.heading }}>{title}</div>
        {meta && <div style={{ color: danger ? palette.danger : palette.muted, fontSize: 12, marginTop: 3, fontWeight: type.weight.ui, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 225 }}>{meta}</div>}
      </div>
      {children || <span style={{ color: danger ? palette.danger : palette.muted, fontSize: 20 }}>›</span>}
    </>
  );
  if (clickable) return <button onClick={onClick} style={{ ...rowStyle(), textAlign: "left", cursor: "pointer" }}>{content}</button>;
  return <div style={rowStyle()}>{content}</div>;
}

function InfoCard({ title, meta, body }) {
  return <article style={infoCardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}><h2 style={{ fontSize: 15, fontWeight: type.weight.heading }}>{title}</h2><span style={metaStyle}>{meta}</span></div><p style={bodyCopyStyle}>{body}</p></article>;
}

function SegmentedControl({ options, value, onChange }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{options.map(([id, label]) => { const active = value === id; return <button key={id} onClick={() => onChange(id)} style={{ border: `1px solid ${active ? palette.accentLine : palette.line}`, background: active ? palette.accentSoft : palette.surface, color: active ? palette.accent : palette.muted, borderRadius: 999, minHeight: 48, padding: "9px 11px", fontSize: 12, fontWeight: type.weight.ui, cursor: "pointer" }}>{label}</button>; })}</div>;
}

function SwitchButton({ active, onClick }) {
  return <button aria-pressed={active} onClick={onClick} style={{ width: 48, height: 28, minHeight: 28, border: `1px solid ${active ? palette.accentLine : palette.line}`, borderRadius: 999, background: active ? palette.accentSoft : palette.wash, padding: 3, display: "flex", justifyContent: active ? "flex-end" : "flex-start", cursor: "pointer" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: active ? palette.accent : palette.muted, display: "block" }} /></button>;
}

function Dialog({ title, children, onClose }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 1700, background: palette.overlay, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 20 }}><section role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 452, background: palette.surface, border: "none", borderRadius: 20, padding: 20, display: "grid", gap: 14, boxShadow: palette.sideShadow }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ fontFamily: type.serif, fontSize: 24, lineHeight: 1.15, fontWeight: type.weight.heading }}>{title}</h2><button onClick={onClose} style={ghostButton()}>×</button></div>{children}</section></div>;
}

const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const titleStyle = { fontFamily: type.serif, fontSize: 34, lineHeight: 1.08, fontWeight: type.weight.heading, letterSpacing: 0 };
const toastStyle = { background: palette.surface, color: palette.stone, borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: type.weight.ui, boxShadow: palette.shadow };
const cardStyle = { border: "none", background: palette.surface, borderRadius: 20, padding: 16, display: "grid", gap: 13, boxShadow: palette.shadow };
const infoCardStyle = { ...cardStyle, gap: 5 };
const profileNameStyle = { fontSize: 16, fontWeight: type.weight.heading, color: palette.stone, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const metaStyle = { fontSize: 12, color: palette.muted, marginTop: 2, fontWeight: type.weight.ui };
const statusStyle = { fontSize: 11, fontWeight: type.weight.ui };
const bodyCopyStyle = { color: palette.faint, lineHeight: 1.6, fontSize: 14 };
const emptyTextStyle = { color: palette.muted, padding: 24, textAlign: "center" };
const eyebrowStyle = { color: palette.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0, fontWeight: type.weight.ui, marginTop: 8 };

const rowStyle = () => ({ ...cardStyle, minHeight: 70, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" });
const inlineButton = (color = palette.accent) => ({ border: `1px solid ${palette.line}`, background: palette.surface, color, borderRadius: 999, minHeight: 48, padding: "9px 12px", fontSize: 12, fontWeight: type.weight.ui, whiteSpace: "nowrap", cursor: "pointer" });
const labelStyle = () => ({ display: "grid", gap: 7, color: palette.muted, fontSize: 11, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0 });
const inputStyle = () => ({ ...field });
const ghostButton = () => ({ border: `1px solid ${palette.line}`, background: palette.surface, color: palette.stone, borderRadius: 999, minWidth: 48, minHeight: 48, padding: "8px 12px", fontSize: 14, cursor: "pointer" });
const smallButton = (color = palette.stone) => ({ border: `1px solid ${palette.line}`, background: palette.surface, color, borderRadius: 12, minHeight: 48, padding: "9px 8px", fontSize: 12, fontWeight: type.weight.ui, cursor: "pointer" });
const primaryButton = (active = true) => ({ width: "100%", border: "none", background: active ? palette.accent : palette.wash, color: active ? palette.surface : palette.muted, borderRadius: 14, minHeight: 48, padding: "13px", fontSize: 14, fontWeight: type.weight.heading, cursor: "pointer" });
const dangerButton = (active = true) => ({ width: "100%", border: `1px solid ${palette.dangerSoft}`, background: active ? palette.dangerSoft : palette.wash, color: active ? palette.danger : palette.muted, borderRadius: 14, minHeight: 48, padding: "13px", fontSize: 14, fontWeight: type.weight.heading, cursor: active ? "pointer" : "not-allowed" });
