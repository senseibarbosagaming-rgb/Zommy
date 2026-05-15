import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Family sharing",
    subtitle: "Share a child’s story with another parent using their Google account email.",
    chooseChild: "Child",
    email: "Parent email",
    emailPlaceholder: "name@example.com",
    createInvite: "Create invite link",
    copyLink: "Copy invite link",
    cancelInvite: "Cancel",
    removeAccess: "Remove",
    copied: "Invite link copied.",
    created: "Invite created.",
    removed: "Access removed.",
    cancelled: "Invite cancelled.",
    noChildren: "Add a child before inviting someone.",
    pending: "Pending invites",
    members: "Shared with",
    owner: "Owner",
    editor: "Editor",
    you: "You",
    expires: "Expires",
    noMembers: "No shared members yet.",
    noInvites: "No pending invites.",
    close: "Close",
    error: "Something went wrong.",
    inviteError: "Could not create invite.",
    hint: "Send this link to the other parent. They should open it, sign in with the invited Google account, and Zommy will add the child to their app.",
  },
  pt: {
    title: "Partilha familiar",
    subtitle: "Partilha a história de uma criança com outro pai/mãe usando o email da conta Google.",
    chooseChild: "Criança",
    email: "Email do pai/mãe",
    emailPlaceholder: "nome@exemplo.com",
    createInvite: "Criar link de convite",
    copyLink: "Copiar link",
    cancelInvite: "Cancelar",
    removeAccess: "Remover",
    copied: "Link copiado.",
    created: "Convite criado.",
    removed: "Acesso removido.",
    cancelled: "Convite cancelado.",
    noChildren: "Adiciona uma criança antes de convidar alguém.",
    pending: "Convites pendentes",
    members: "Partilhado com",
    owner: "Owner",
    editor: "Editor",
    you: "Tu",
    expires: "Expira",
    noMembers: "Ainda não há membros partilhados.",
    noInvites: "Sem convites pendentes.",
    close: "Fechar",
    error: "Algo correu mal.",
    inviteError: "Não foi possível criar o convite.",
    hint: "Envia este link à outra pessoa. Deve abrir o link, iniciar sessão com a conta Google convidada, e o Zommy adiciona a criança à app.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const randomToken = () => {
  const values = new Uint8Array(24);
  crypto.getRandomValues(values);
  return Array.from(values).map((value) => value.toString(16).padStart(2, "0")).join("");
};

const inviteLink = (token) => `${window.location.origin}${window.location.pathname}?zommy_invite=${encodeURIComponent(token)}`;
const formatShortDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

export default function FamilySharingScreen() {
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [lastLink, setLastLink] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, profiles, refresh } = useZommyData({ includeEntries: false, includeLocal: false });
  const lang = getPrefs().lang === "pt" ? "pt" : "en";
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);
  const selectedProfile = profiles.find((profile) => profile.id === profileId) || profiles[0];
  const currentMember = members.find((member) => member.is_current_user);
  const isOwner = currentMember?.role === "owner";

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadSharing = async (nextProfileId = profileId || profiles[0]?.id) => {
    if (!nextProfileId) return;
    const [{ data: memberRows, error: memberError }, { data: inviteRows }] = await Promise.all([
      supabase.rpc("list_profile_members", { target_profile_id: nextProfileId }),
      supabase.from("profile_invites").select("*").eq("profile_id", nextProfileId).is("accepted_at", null).order("created_at", { ascending: false }),
    ]);
    if (memberError) console.error("Failed to load profile members", memberError);
    setMembers(memberRows || []);
    setInvites(inviteRows || []);
  };

  useEffect(() => {
    const show = async () => {
      setOpen(true);
      const data = await refresh();
      const firstProfile = data?.profiles?.[0];
      if (firstProfile) {
        setProfileId(firstProfile.id);
        loadSharing(firstProfile.id);
      }
    };
    const hide = () => setOpen(false);
    window.addEventListener("zommy:show-family-sharing", show);
    window.addEventListener("zommy:hide-family-sharing", hide);
    return () => {
      window.removeEventListener("zommy:show-family-sharing", show);
      window.removeEventListener("zommy:hide-family-sharing", hide);
    };
  }, [refresh]);

  useEffect(() => {
    if (open && selectedProfile?.id) loadSharing(selectedProfile.id);
  }, [open, selectedProfile?.id]);

  if (!open || !user) return null;

  const createInvite = async () => {
    if (!selectedProfile || !email.trim()) return;
    setBusy(true);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    const { error } = await supabase.from("profile_invites").insert({
      profile_id: selectedProfile.id,
      email: email.trim().toLowerCase(),
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    });
    setBusy(false);
    if (error) {
      console.error("Failed to create invite", error);
      showToast(copy.inviteError);
      return;
    }
    const link = inviteLink(token);
    setLastLink(link);
    setEmail("");
    await loadSharing(selectedProfile.id);
    showToast(copy.created);
  };

  const copyInvite = async (link = lastLink) => {
    if (!link) return;
    await navigator.clipboard?.writeText(link).catch(() => null);
    showToast(copy.copied);
  };

  const removeMember = async (member) => {
    if (!selectedProfile || !member?.user_id || member.role === "owner") return;
    setBusy(true);
    const { error } = await supabase.rpc("remove_profile_member", { target_profile_id: selectedProfile.id, target_user_id: member.user_id });
    setBusy(false);
    if (error) {
      console.error("Failed to remove member", error);
      showToast(copy.error);
      return;
    }
    await loadSharing(selectedProfile.id);
    window.dispatchEvent(new CustomEvent("zommy:sharing-changed"));
    showToast(copy.removed);
  };

  const cancelInvite = async (invite) => {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_profile_invite", { target_invite_id: invite.id });
    setBusy(false);
    if (error) {
      console.error("Failed to cancel invite", error);
      showToast(copy.error);
      return;
    }
    await loadSharing(selectedProfile.id);
    showToast(copy.cancelled);
  };

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1250, background: "#101418", color: "#fff", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", padding: "22px 16px 112px", display: "grid", gap: 15 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 36, lineHeight: 1.05, fontWeight: 650 }}>{copy.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.5, fontSize: 14, marginTop: 7 }}>{copy.subtitle}</p>
          </div>
          <button onClick={() => setOpen(false)} style={ghostButton()}>{copy.close}</button>
        </header>

        {toast && <div role="status" style={{ background: "#fff", color: "#111", borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 850 }}>{toast}</div>}

        {!profiles.length ? (
          <section style={panelStyle()}>{copy.noChildren}</section>
        ) : (
          <>
            <section style={panelStyle()}>
              <label style={labelStyle()}>
                {copy.chooseChild}
                <select value={selectedProfile?.id || ""} onChange={(event) => setProfileId(event.target.value)} style={fieldStyle()}>
                  {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </label>
              <label style={labelStyle()}>
                {copy.email}
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder={copy.emailPlaceholder} style={fieldStyle()} />
              </label>
              <button disabled={busy || !email.trim() || !isOwner} onClick={createInvite} style={primaryButton(!busy && !!email.trim() && isOwner)}>{copy.createInvite}</button>
              {lastLink && <button onClick={() => copyInvite(lastLink)} style={secondaryButton()}>{copy.copyLink}</button>}
              <p style={{ color: "rgba(255,255,255,0.56)", lineHeight: 1.5, fontSize: 12 }}>{copy.hint}</p>
            </section>

            <section style={panelStyle()}>
              <h2 style={sectionTitle()}>{copy.members}</h2>
              {members.length ? members.map((member) => {
                const canRemove = isOwner && !member.is_current_user && member.role !== "owner";
                return (
                  <div key={member.membership_id} style={rowStyle()}>
                    <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <span style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.is_current_user ? `${copy.you} · ${member.email}` : member.email}</span>
                      <span style={{ color: member.role === "owner" ? "#FBBF24" : "#34D399", fontSize: 11, fontWeight: 900 }}>{member.role === "owner" ? copy.owner : copy.editor}</span>
                    </span>
                    {canRemove && <button disabled={busy} onClick={() => removeMember(member)} style={miniDangerButton()}>{copy.removeAccess}</button>}
                  </div>
                );
              }) : <p style={emptyStyle()}>{copy.noMembers}</p>}
            </section>

            <section style={panelStyle()}>
              <h2 style={sectionTitle()}>{copy.pending}</h2>
              {invites.length ? invites.map((invite) => {
                const link = inviteLink(invite.token);
                return (
                  <div key={invite.id} style={{ ...rowStyle(), alignItems: "flex-start" }}>
                    <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 850 }}>{invite.email}</span>
                      <span style={{ color: "rgba(255,255,255,0.44)", fontSize: 11 }}>{copy.expires} {formatShortDate(invite.expires_at)}</span>
                    </span>
                    <span style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => copyInvite(link)} style={miniButton()}>{copy.copyLink}</button>
                      {isOwner && <button disabled={busy} onClick={() => cancelInvite(invite)} style={miniDangerButton()}>{copy.cancelInvite}</button>}
                    </span>
                  </div>
                );
              }) : <p style={emptyStyle()}>{copy.noInvites}</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const panelStyle = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.045)", borderRadius: 20, padding: 15, display: "grid", gap: 12, lineHeight: 1.55 });
const labelStyle = () => ({ display: "grid", gap: 7, color: "rgba(255,255,255,0.64)", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const fieldStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "#151d25", color: "#fff", borderRadius: 13, padding: "12px 13px", font: "inherit", fontSize: 15 });
const primaryButton = (active = true) => ({ width: "100%", border: "none", background: active ? "#34D399" : "rgba(255,255,255,0.1)", color: active ? "#101418" : "rgba(255,255,255,0.42)", borderRadius: 15, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: active ? "pointer" : "not-allowed" });
const secondaryButton = () => ({ width: "100%", border: "1px solid rgba(52,211,153,0.45)", background: "rgba(52,211,153,0.12)", color: "#34D399", borderRadius: 15, minHeight: 44, fontSize: 13, fontWeight: 900, cursor: "pointer" });
const ghostButton = () => ({ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, minHeight: 44, padding: "8px 12px", fontSize: 13, fontWeight: 850, cursor: "pointer" });
const miniButton = () => ({ border: "1px solid rgba(255,255,255,0.13)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.78)", borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap", cursor: "pointer" });
const miniDangerButton = () => ({ border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.1)", color: "#fca5a5", borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap", cursor: "pointer" });
const sectionTitle = () => ({ fontSize: 13, fontWeight: 950, color: "rgba(255,255,255,0.68)", textTransform: "uppercase", letterSpacing: "0.8px" });
const rowStyle = () => ({ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.035)", borderRadius: 14, padding: 11, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" });
const emptyStyle = () => ({ color: "rgba(255,255,255,0.46)", fontSize: 13, lineHeight: 1.5 });
