import { useEffect, useMemo, useState } from "react";
import { appSurface, card, contentFrame, emptyStateCard, field, label, palette, softCard, type } from "./designSystem";
import { supabase } from "./supabase";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    title: "Family",
    subtitle: "Add loved ones to the same private family archive.",
    chooseChild: "Child",
    email: "Family email",
    emailPlaceholder: "name@example.com",
    createInvite: "Add to the story",
    copyLink: "Copy invite link",
    cancelInvite: "Cancel",
    removeAccess: "Remove",
    copied: "Invite link copied.",
    created: "Invite created.",
    removed: "Access removed.",
    cancelled: "Invite cancelled.",
    noChildren: "Add a child before inviting someone.",
    pending: "Pending invites",
    members: "Part of this story",
    owner: "Parent",
    editor: "Family member",
    you: "You",
    expires: "Expires",
    noMembers: "No one else has been added yet.",
    noInvites: "No pending invites.",
    close: "Close",
    error: "Something went wrong.",
    inviteError: "Could not create invite.",
    hint: "Theyâ€™ll be able to add memories, see the timeline, and keep the same family archive with you. Only invited family members can see this.",
  },
  pt: {
    title: "FamÃ­lia",
    subtitle: "Adiciona pessoas queridas ao mesmo arquivo privado da famÃ­lia.",
    chooseChild: "CrianÃ§a",
    email: "Email do pai/mÃ£e",
    emailPlaceholder: "nome@exemplo.com",
    createInvite: "Adicionar Ã  histÃ³ria",
    copyLink: "Copiar link",
    cancelInvite: "Cancelar",
    removeAccess: "Remover",
    copied: "Link copiado.",
    created: "Convite criado.",
    removed: "Acesso removido.",
    cancelled: "Convite cancelado.",
    noChildren: "Adiciona uma crianÃ§a antes de convidar alguÃ©m.",
    pending: "Convites pendentes",
    members: "Nesta histÃ³ria",
    owner: "Parent",
    editor: "Family member",
    you: "Tu",
    expires: "Expira",
    noMembers: "Ainda nÃ£o adicionaste mais ninguÃ©m.",
    noInvites: "Sem convites pendentes.",
    close: "Fechar",
    error: "Algo correu mal.",
    inviteError: "NÃ£o foi possÃ­vel criar o convite.",
    hint: "Vai poder adicionar memÃ³rias, ver a timeline e guardar o mesmo arquivo familiar contigo. SÃ³ familiares convidados podem ver isto.",
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
    <main className="zommy-primary-screen" style={appSurface}>
      <div style={contentFrame(124)}>
        <header style={{ ...softCard({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }) }}>
          <div>
            <div style={{ ...label, color: selectedProfile?.color || palette.clay }}>{selectedProfile?.name || copy.chooseChild}</div>
            <h1 style={{ fontFamily: type.serif, fontSize: 34, lineHeight: 1.06, fontWeight: type.weight.heading, marginTop: 5 }}>{copy.title}</h1>
            <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14, marginTop: 7 }}>{copy.subtitle}</p>
          </div>
          <button className="b" onClick={() => setOpen(false)} style={ghostButton()}>{copy.close}</button>
        </header>

        {toast && <div role="status" style={{ ...card, padding: "10px 12px", fontSize: 13, fontWeight: type.weight.ui }}>{toast}</div>}

        {!profiles.length ? (
          <section style={emptyStateCard}>{copy.noChildren}</section>
        ) : (
          <>
            <section style={{ ...softCard({ display: "grid", gap: 12, borderColor: `${selectedProfile?.color || palette.clay}36` }) }}>
              <h2 style={{ fontFamily: type.serif, fontSize: 25, lineHeight: 1.12 }}>Add {selectedProfile?.name || "family"} to the story.</h2>
              <p style={{ color: palette.inkMuted, lineHeight: 1.55, fontSize: 14 }}>{copy.hint}</p>
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
              <button className="b" disabled={busy || !email.trim() || !isOwner} onClick={createInvite} style={primaryButton(!busy && !!email.trim() && isOwner)}>{copy.createInvite}</button>
              {lastLink && <button className="b" onClick={() => copyInvite(lastLink)} style={secondaryButton()}>{copy.copyLink}</button>}
            </section>

            <section style={{ ...softCard({ display: "grid", gap: 10 }) }}>
              <h2 style={sectionTitle()}>{copy.members}</h2>
              {members.length ? members.map((member) => {
                const canRemove = isOwner && !member.is_current_user && member.role !== "owner";
                return (
                  <div key={member.membership_id} style={rowStyle()}>
                    <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <span style={{ color: palette.ink, fontSize: 13, fontWeight: type.weight.ui, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.is_current_user ? `${copy.you} Â· ${member.email}` : member.email}</span>
                      <span style={{ color: member.role === "owner" ? palette.clay : palette.sage, fontSize: 11, fontWeight: type.weight.ui }}>{member.role === "owner" ? copy.owner : copy.editor}</span>
                    </span>
                    {canRemove && <button disabled={busy} onClick={() => removeMember(member)} style={miniDangerButton()}>{copy.removeAccess}</button>}
                  </div>
                );
              }) : <p style={emptyStyle()}>{copy.noMembers}</p>}
            </section>

            <section style={{ ...softCard({ display: "grid", gap: 10 }) }}>
              <h2 style={sectionTitle()}>{copy.pending}</h2>
              {invites.length ? invites.map((invite) => {
                const link = inviteLink(invite.token);
                return (
                  <div key={invite.id} style={rowStyle()}>
                    <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <span style={{ color: palette.ink, fontSize: 13, fontWeight: type.weight.ui }}>{invite.email}</span>
                      <span style={{ color: palette.inkFaint, fontSize: 11 }}>{copy.expires} {formatShortDate(invite.expires_at)}</span>
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
const labelStyle = () => ({ display: "grid", gap: 7, ...label, color: palette.inkMuted });
const fieldStyle = () => field;
const primaryButton = (active = true) => ({ ...primaryButtonBase(active) });
const primaryButtonBase = (active = true) => ({ width: "100%", border: "none", background: active ? palette.clay : palette.wash, color: active ? palette.surface : palette.inkFaint, borderRadius: 18, minHeight: 50, fontSize: 14, fontWeight: type.weight.heading, cursor: active ? "pointer" : "not-allowed", boxShadow: active ? palette.shadow : "none" });
const secondaryButton = () => ({ border: `1px solid ${palette.line}`, background: palette.surface, color: palette.deep, borderRadius: 18, minHeight: 46, fontSize: 13, fontWeight: type.weight.ui, cursor: "pointer" });
const ghostButton = () => ({ border: `1px solid ${palette.border}`, background: palette.surface, color: palette.inkMuted, borderRadius: 999, minHeight: 48, padding: "8px 12px", fontSize: 13, fontWeight: type.weight.ui, cursor: "pointer" });
const miniButton = () => ({ border: `1px solid ${palette.border}`, background: palette.surface, color: palette.inkMuted, borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: type.weight.ui, whiteSpace: "nowrap", cursor: "pointer" });
const miniDangerButton = () => ({ border: `1px solid ${palette.dangerSoft}`, background: palette.dangerSoft, color: palette.danger, borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: type.weight.ui, whiteSpace: "nowrap", cursor: "pointer" });
const sectionTitle = () => ({ fontSize: 12, fontWeight: type.weight.ui, color: palette.inkMuted, textTransform: "uppercase", letterSpacing: 0 });
const rowStyle = () => ({ border: `1px solid ${palette.border}`, background: "rgba(255,253,248,0.60)", borderRadius: 18, padding: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" });
const emptyStyle = () => ({ color: palette.inkMuted, fontSize: 13, lineHeight: 1.5 });

