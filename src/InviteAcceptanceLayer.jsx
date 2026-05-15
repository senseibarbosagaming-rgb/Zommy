import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const COPY = {
  en: {
    joining: "Joining shared child…",
    success: "Shared child added to Zommy.",
    login: "Sign in to accept this family invite.",
    mismatch: "This invite must be opened with the invited Google account.",
    error: "Could not accept this invite.",
  },
  pt: {
    joining: "A juntar criança partilhada…",
    success: "Criança partilhada adicionada ao Zommy.",
    login: "Inicia sessão para aceitar este convite familiar.",
    mismatch: "Este convite tem de ser aberto com a conta Google convidada.",
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

export default function InviteAcceptanceLayer() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  useEffect(() => {
    let timeout;

    const acceptInvite = async () => {
      const token = readInviteToken();
      if (!token) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user || null;

      if (!user) {
        localStorage.setItem("zommy_pending_invite", token);
        setVisible(true);
        setMessage(copy.login);
        timeout = window.setTimeout(() => setVisible(false), 4200);
        return;
      }

      setVisible(true);
      setMessage(copy.joining);

      const { error } = await supabase.rpc("accept_profile_invite", { invite_token: token });
      if (error) {
        console.error("Invite acceptance failed", error);
        setMessage((error.message || "").toLowerCase().includes("email") ? copy.mismatch : copy.error);
        timeout = window.setTimeout(() => setVisible(false), 5200);
        return;
      }

      localStorage.removeItem("zommy_pending_invite");
      cleanInviteTokenFromUrl();
      setMessage(copy.success);
      window.dispatchEvent(new CustomEvent("zommy:sharing-changed"));
      window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
      timeout = window.setTimeout(() => setVisible(false), 4200);
    };

    const acceptPendingAfterLogin = async () => {
      const pending = localStorage.getItem("zommy_pending_invite");
      if (!pending) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return;

      setVisible(true);
      setMessage(copy.joining);
      const { error } = await supabase.rpc("accept_profile_invite", { invite_token: pending });
      if (error) {
        console.error("Pending invite acceptance failed", error);
        setMessage((error.message || "").toLowerCase().includes("email") ? copy.mismatch : copy.error);
        timeout = window.setTimeout(() => setVisible(false), 5200);
        return;
      }

      localStorage.removeItem("zommy_pending_invite");
      setMessage(copy.success);
      window.dispatchEvent(new CustomEvent("zommy:sharing-changed"));
      window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
      timeout = window.setTimeout(() => setVisible(false), 4200);
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
    <div role="status" style={{ position: "fixed", left: "50%", top: "calc(18px + env(safe-area-inset-top, 0px))", transform: "translateX(-50%)", width: "min(420px, calc(100vw - 28px))", zIndex: 2800, border: "1px solid rgba(167,139,250,0.45)", background: "rgba(16,20,24,0.94)", color: "#fff", borderRadius: 22, padding: "14px 15px", boxShadow: "0 22px 80px rgba(0,0,0,0.42)", display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, alignItems: "center", backdropFilter: "blur(18px)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(167,139,250,0.18)", color: "#C4B5FD", display: "grid", placeItems: "center", fontSize: 23 }}>👪</div>
      <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 1.45, fontWeight: 850 }}>{message}</div>
    </div>
  );
}
