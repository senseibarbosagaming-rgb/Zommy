import { useEffect, useMemo, useState } from "react";
import { palette, type } from "./designSystem";
import { supabase } from "./supabase";

const COPY = {
  en: {
    joining: "Joining this family circle...",
    success: "You're now part of this child's family circle.",
    login: "Sign in to join this child's family circle. Use the email the invite was sent to.",
    mismatch: "This invite was sent to another email. Ask for a new invite or sign in with the invited Google account.",
    expired: "This invite is no longer active. Ask the owner to send a new one.",
    alreadyMember: "You're already part of this child's family circle.",
    error: "Could not accept this invite.",
  },
  pt: {
    joining: "A juntar ao círculo familiar...",
    success: "Já fazes parte do círculo familiar desta criança.",
    login: "Inicia sessão para entrar no círculo familiar desta criança. Usa o email para onde o convite foi enviado.",
    mismatch: "Este convite foi enviado para outro email. Pede um novo convite ou entra com a conta Google convidada.",
    expired: "Este convite já não está ativo. Pede ao owner para enviar um novo.",
    alreadyMember: "Já fazes parte do círculo familiar desta criança.",
    error: "Não foi possível aceitar este convite.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const readInviteToken = () => new URLSearchParams(window.location.search).get("zommy_invite") || "";

const cleanInviteTokenFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("zommy_invite");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
};

const inviteErrorMessage = (error, copy) => {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  if (text.includes("email")) return copy.mismatch;
  if (text.includes("expired") || text.includes("cancelled") || text.includes("invalid") || text.includes("not active")) return copy.expired;
  if (text.includes("already") || text.includes("duplicate")) return copy.alreadyMember;
  return copy.error;
};

export default function InviteAcceptanceLayer() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  useEffect(() => {
    let timeout;

    const acceptToken = async (token, shouldCleanUrl = false) => {
      if (!token) return;
      setVisible(true);
      setMessage(copy.joining);

      const { error } = await supabase.rpc("accept_profile_invite", { invite_token: token });
      if (error) {
        console.error("Invite acceptance failed", error);
        setMessage(inviteErrorMessage(error, copy));
        timeout = window.setTimeout(() => setVisible(false), 6200);
        return;
      }

      localStorage.removeItem("zommy_pending_invite");
      if (shouldCleanUrl) cleanInviteTokenFromUrl();
      setMessage(copy.success);
      window.dispatchEvent(new CustomEvent("zommy:sharing-changed"));
      window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
      timeout = window.setTimeout(() => setVisible(false), 4400);
    };

    const acceptInvite = async () => {
      const token = readInviteToken();
      if (!token) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user || null;

      if (!user) {
        localStorage.setItem("zommy_pending_invite", token);
        setVisible(true);
        setMessage(copy.login);
        timeout = window.setTimeout(() => setVisible(false), 6200);
        return;
      }

      await acceptToken(token, true);
    };

    const acceptPendingAfterLogin = async () => {
      const pending = localStorage.getItem("zommy_pending_invite");
      if (!pending) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return;
      await acceptToken(pending, false);
    };

    acceptInvite();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => acceptPendingAfterLogin());

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [copy]);

  if (!visible || !message) return null;

  return (
    <div role="status" style={toastStyle}>
      <div style={iconStyle}>👪</div>
      <div style={messageStyle}>{message}</div>
    </div>
  );
}

const toastStyle = { position: "fixed", left: "50%", top: "calc(18px + env(safe-area-inset-top, 0px))", transform: "translateX(-50%)", width: "min(420px, calc(100vw - 40px))", zIndex: 2800, border: "none", background: palette.surface, color: palette.stone, borderRadius: 20, padding: "14px 15px", boxShadow: palette.sideShadow, display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, alignItems: "center", fontFamily: type.sans };
const iconStyle = { width: 44, height: 44, borderRadius: 16, background: palette.accentSoft, color: palette.accent, display: "grid", placeItems: "center", fontSize: 23 };
const messageStyle = { color: palette.stone, fontSize: 14, lineHeight: 1.45, fontWeight: type.weight.ui };
