import { useEffect, useMemo, useState } from "react";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import { loadNotificationPrefs, saveNotificationPrefs } from "./notificationCore";
import { supabase } from "./supabase";

const PALETTE = [
  { color: "#60A5FA", bg: "#1e3a5f" },
  { color: "#F472B6", bg: "#5f1e3a" },
  { color: "#34D399", bg: "#1e5f3a" },
  { color: "#FBBF24", bg: "#5f4a1e" },
  { color: "#A78BFA", bg: "#3a1e5f" },
  { color: "#FB7185", bg: "#5f1e2a" },
];

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];
const normalizeTheme = (theme) => theme === "light" ? "dream" : theme === "dark" ? "night" : theme || "dream";

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
    theme: "Theme",
    signOut: "Log out",
    signingOut: "Logging out…",
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
    night: "Night",
    dream: "Dream",
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
    theme: "Tema",
    signOut: "Terminar sessão",
    signingOut: "A terminar sessão…",
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
    night: "Noite",
    dream: "Sonho",
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
  ["zommy:hide-today", "zommy:hide-timeline", "zommy:hide-compare", "zommy:hide-settings"].forEach((eventName) => {
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
  const activeTheme = normalizeTheme(prefs.theme);

  const sectionTitle = section === "children" ? copy.manageChildren : section === "notifications" ? copy.notificationSchedule : section === "delete" ? copy.deleteAccountData : copy.title;

  const renderProfile = (profile) => (
    <article key={profile.id} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.045)", borderRadius: 18, padding: 14, display: "grid", gap: 11, opacity: profile.archived_at ? 0.72 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: `${profile.color || "#34D399"}22`, color: profile.color || "#34D399", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{profile.emoji || "👶"}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", marginTop: 2 }}>{profile.birthdate} · {entryCountByProfile[profile.id] || 0} {copy.memories}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 900, color: profile.archived_at ? "#FBBF24" : "#34D399" }}>{profile.archived_at ? copy.archived : copy.active}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button disabled={busy} onClick={() => setEditing(profile)} style={smallButton()}>{copy.edit}</button>
        <button disabled={busy} onClick={() => archiveProfile(profile, !profile.archived_at)} style={smallButton(profile.archived_at ? "#34D399" : "#FBBF24")}>{profile.archived_at ? copy.restore : copy.archive}</button>
        <button disabled={busy} onClick={() => { setConfirmChild(profile); setConfirmText(""); }} style={smallButton("#FB7185")}>{copy.delete}</button>
      </div>
    </article>
  );

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 900, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", padding: "20px 16px 112px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 34, lineHeight: 1.08, fontWeight: 650 }}>{sectionTitle}</h1>
          {section !== "menu" && <button aria-label={copy.back} onClick={() => setSection("menu")} style={ghostButton()}>←</button>}
        </header>

        {toast && <div role="status" style={{ background: "#fff", color: "#111", borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{toast}</div>}

        {section === "menu" && (
          <section style={{ display: "grid", gap: 10 }}>
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

            <SettingRow title={copy.theme} meta={activeTheme === "dream" ? copy.dream : copy.night}>
              <SegmentedControl options={[["night", copy.night], ["dream", copy.dream]]} value={activeTheme} onChange={(theme) => updatePrefs({ ...prefs, theme })} />
            </SettingRow>

            <SettingRow title={copy.exportData} meta={copy.directExport(entries.length, profiles.length)}>
              <button onClick={exportData} style={inlineButton("#34D399")}>{copy.exportData}</button>
            </SettingRow>

            <InfoCard title={copy.storageUsage} meta={formatBytes(estimatedStorage)} body={copy.storageHint} />
            <InfoCard title={copy.privacy} meta={copy.privateAccountData} body={copy.privacyText} />
            <InfoCard title={copy.familySharing} meta={copy.comingSoon} body={copy.familySharingText} />
            <SettingRow title={copy.account} meta={user.email || ""}>
              <button disabled={busy} onClick={signOut} style={inlineButton("#FBBF24")}>{busy ? copy.signingOut : copy.signOut}</button>
            </SettingRow>
            <SettingRow title={copy.deleteAccountData} meta={copy.permanent} danger onClick={() => setSection("delete")} />
          </section>
        )}

        {section === "children" && <section style={{ display: "grid", gap: 14 }}><p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.55, fontSize: 13 }}>{copy.archiveHint}</p>{activeProfiles.length ? activeProfiles.map(renderProfile) : <p style={{ color: "rgba(255,255,255,0.48)", padding: 24, textAlign: "center" }}>{copy.noChildren}</p>}{archivedProfiles.length > 0 && <h2 style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 8 }}>{copy.archived}</h2>}{archivedProfiles.map(renderProfile)}</section>}
        {section === "delete" && <Panel><p>{copy.deleteAccountBody}</p><button onClick={() => { setConfirmAll(true); setConfirmText(""); }} style={dangerButton()}>{copy.deleteAccountData}</button></Panel>}
        {section === "notifications" && <NotificationSettingsPanel profiles={profiles} entries={entries} />}

        {editing && <Dialog title={copy.manageChildren} onClose={() => setEditing(null)}><label style={labelStyle()}>{copy.name}<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inputStyle()} /></label><label style={labelStyle()}>{copy.birthDate}<input type="date" value={editing.birthdate} max={today()} onChange={(e) => setEditing({ ...editing, birthdate: e.target.value })} style={inputStyle()} /></label><div style={labelStyle()}>{copy.emoji}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{EMOJIS.map((emoji) => <button key={emoji} onClick={() => setEditing({ ...editing, emoji })} style={{ width: 44, height: 44, borderRadius: 13, border: `1px solid ${editing.emoji === emoji ? "#fff" : "rgba(255,255,255,0.14)"}`, background: "rgba(255,255,255,0.05)", fontSize: 21 }}>{emoji}</button>)}</div></div><div style={labelStyle()}>{copy.color}<div style={{ display: "flex", gap: 12 }}>{PALETTE.map((item) => <button key={item.color} onClick={() => setEditing({ ...editing, color: item.color, bg: item.bg })} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: item.color, outline: editing.color === item.color ? `3px solid ${item.color}` : "none", outlineOffset: 4 }} />)}</div></div><button disabled={busy} onClick={saveProfile} style={primaryButton()}>{copy.save}</button></Dialog>}
        {confirmChild && <Dialog title={copy.deleteChildTitle(confirmChild.name)} onClose={() => setConfirmChild(null)}><p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>{copy.deleteChildBody(confirmChild.name, entryCountByProfile[confirmChild.id] || 0)}</p><label style={labelStyle()}>{copy.typeName(confirmChild.name)}<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle()} /></label><button disabled={busy || confirmText !== confirmChild.name} onClick={deleteProfile} style={dangerButton(confirmText === confirmChild.name)}>{copy.deleteChildConfirm}</button></Dialog>}
        {confirmAll && <Dialog title={copy.deleteAccountTitle} onClose={() => setConfirmAll(false)}><p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>{copy.deleteAccountBody}</p><label style={labelStyle()}>{copy.typeDelete}<input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle()} /></label><button disabled={busy || confirmText !== "DELETE"} onClick={deleteAllData} style={dangerButton(confirmText === "DELETE")}>{copy.deleteAll}</button></Dialog>}
      </div>
    </main>
  );
}

function Panel({ children }) {
  return <section style={{ display: "grid", gap: 13, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>{children}</section>;
}

function SettingRow({ title, meta, children, danger = false, onClick }) {
  const clickable = Boolean(onClick);
  const content = <><div style={{ minWidth: 0 }}><div style={{ color: danger ? "#fca5a5" : "#fff", fontSize: 15, fontWeight: 900 }}>{title}</div>{meta && <div style={{ color: danger ? "rgba(252,165,165,0.62)" : "rgba(255,255,255,0.52)", fontSize: 12, marginTop: 3, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 225 }}>{meta}</div>}</div>{children || <span style={{ color: danger ? "#fca5a5" : "rgba(255,255,255,0.42)", fontSize: 20 }}>›</span>}</>;
  if (clickable) return <button onClick={onClick} style={{ ...rowStyle(), color: "#fff", textAlign: "left", cursor: "pointer" }}>{content}</button>;
  return <div style={rowStyle()}>{content}</div>;
}

function InfoCard({ title, meta, body }) {
  return <article style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.035)", borderRadius: 16, padding: 14, display: "grid", gap: 5 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}><h2 style={{ fontSize: 15, fontWeight: 900 }}>{title}</h2><span style={{ color: "rgba(255,255,255,0.52)", fontSize: 12, fontWeight: 850 }}>{meta}</span></div><p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5 }}>{body}</p></article>;
}

function SegmentedControl({ options, value, onChange }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>{options.map(([id, label]) => { const active = value === id; return <button key={id} onClick={() => onChange(id)} style={{ border: `1px solid ${active ? "#34D399" : "rgba(255,255,255,0.14)"}`, background: active ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.04)", color: active ? "#34D399" : "rgba(255,255,255,0.68)", borderRadius: 999, padding: "9px 11px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>{label}</button>; })}</div>;
}

function SwitchButton({ active, onClick }) {
  return <button aria-pressed={active} onClick={onClick} style={{ width: 44, height: 26, minHeight: 26, border: `1px solid ${active ? "#34D399" : "rgba(255,255,255,0.18)"}`, borderRadius: 999, background: active ? "rgba(52,211,153,0.24)" : "rgba(255,255,255,0.06)", padding: 3, display: "flex", justifyContent: active ? "flex-end" : "flex-start", cursor: "pointer" }}><span style={{ width: 18, height: 18, borderRadius: "50%", background: active ? "#34D399" : "rgba(255,255,255,0.58)", display: "block" }} /></button>;
}

function Dialog({ title, children, onClose }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 1700, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}><section role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 452, background: "#111820", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 18, display: "grid", gap: 14, boxShadow: "0 24px 90px rgba(0,0,0,0.45)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 23, lineHeight: 1.15 }}>{title}</h2><button onClick={onClose} style={ghostButton()}>×</button></div>{children}</section></div>;
}

const rowStyle = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.045)", borderRadius: 16, padding: "14px", minHeight: 70, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" });
const inlineButton = (color = "#fff") => ({ border: `1px solid ${color === "#fff" ? "rgba(255,255,255,0.14)" : color + "66"}`, background: color === "#fff" ? "rgba(255,255,255,0.055)" : color + "22", color: color === "#fff" ? "rgba(255,255,255,0.78)" : color, borderRadius: 999, padding: "9px 11px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap", cursor: "pointer" });
const labelStyle = () => ({ display: "grid", gap: 7, color: "rgba(255,255,255,0.64)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const inputStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 13, padding: "12px 13px", font: "inherit", fontSize: 15 });
const ghostButton = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, minWidth: 44, minHeight: 44, padding: "8px 12px", fontSize: 14, cursor: "pointer" });
const smallButton = (color = "#fff") => ({ border: `1px solid ${color === "#fff" ? "rgba(255,255,255,0.14)" : color + "66"}`, background: color === "#fff" ? "rgba(255,255,255,0.05)" : color + "1f", color, borderRadius: 12, padding: "9px 8px", fontSize: 12, fontWeight: 850, cursor: "pointer" });
const primaryButton = (active = true) => ({ width: "100%", border: `1px solid ${active ? "#34D399" : "rgba(255,255,255,0.14)"}`, background: active ? "#34D399" : "transparent", color: active ? "#111" : "rgba(255,255,255,0.72)", borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 900, cursor: "pointer" });
const dangerButton = (active = true) => ({ width: "100%", border: "1px solid rgba(248,113,113,0.45)", background: active ? "rgba(248,113,113,0.18)" : "rgba(248,113,113,0.06)", color: active ? "#fca5a5" : "rgba(252,165,165,0.45)", borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 900, cursor: active ? "pointer" : "not-allowed" });
