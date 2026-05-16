import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAppShell } from "./AppShellContext";
import FirstRunExperience from "./FirstRunExperience";
import NavExperienceLayer from "./NavExperienceLayer";
import MemoryComposer from "./MemoryComposer";
import CompareScreen from "./CompareScreen";
import NotificationControlsLayer from "./NotificationControlsLayer";
import AccessibilitySafetyLayer from "./AccessibilitySafetyLayer";
import SettingsScreen from "./SettingsScreen";
import PWAExperienceLayer from "./PWAExperienceLayer";
import HomeRitualScreen from "./HomeRitualScreen";
import TimelineScreen from "./TimelineScreen";
import ChildProfileCreator from "./ChildProfileCreator";
import ZommyIntro from "./ZommyIntro";
import ChapterScreen from "./ChapterScreen";
import ChaptersLibrary from "./ChaptersLibrary";
import MemorySavedToast from "./MemorySavedToast";
import FamilySharingScreen from "./FamilySharingScreen";
import InviteAcceptanceLayer from "./InviteAcceptanceLayer";
import FamilySharingEntryLayer from "./FamilySharingEntryLayer";
import FamilyCircleHomeLayer from "./FamilyCircleHomeLayer";
import ResumeRecoveryLayer from "./ResumeRecoveryLayer";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const DEFAULT_PREFS = { lang: "en", theme: "dream" };
const COPY = {
  en: { loading: "Loading…", title: "A calm place for family memories.", body: "Sign in with Google to save your child’s story privately, one small moment at a time.", cta: "Continue with Google", signing: "Opening Google…", signOut: "Sign out", authError: "Could not sign in", providerError: "Google login is not enabled in Supabase yet." },
  pt: { loading: "A carregar…", title: "Um lugar calmo para as memórias da família.", body: "Inicia sessão com o Google para guardar a história da tua criança em privado, um momento de cada vez.", cta: "Continuar com Google", signing: "A abrir o Google…", signOut: "Terminar sessão", authError: "Não foi possível iniciar sessão", providerError: "O login com Google ainda não está ativo no Supabase." },
};

const normalizeTheme = (theme) => theme === "dark" ? "night" : theme === "light" ? "dream" : (theme || DEFAULT_PREFS.theme);
const loadPrefs = () => {
  try { const raw = JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); return { ...DEFAULT_PREFS, ...raw, theme: normalizeTheme(raw.theme) }; }
  catch { return DEFAULT_PREFS; }
};
const savePrefs = (prefs) => localStorage.setItem("zommy_prefs", JSON.stringify(prefs));

const authMessage = (error, copy) => {
  const text = `${error?.message || ""} ${error?.error_code || ""}`.toLowerCase();
  return text.includes("provider") ? copy.providerError : copy.authError;
};

function BrandMark({ size = 92 }) {
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), background: "linear-gradient(145deg,#FFFDF7,#FFE2D1)", border: "1px solid rgba(122,77,57,0.14)", boxShadow: "0 22px 54px rgba(122,77,57,0.18)", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: size * 1.15, height: size * 1.15, borderRadius: "50%", background: "rgba(143,185,168,0.18)", transform: `translate(${-size * 0.34}px, ${-size * 0.34}px)` }} />
      <svg viewBox="0 0 120 120" width={Math.round(size * 0.64)} height={Math.round(size * 0.64)} fill="none" style={{ position: "relative" }}>
        <path d="M24 58L60 30L96 58" stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 54V92H84V54" stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 84C49 76 42 68 42 58C42 51 48 46 55 46C59 46 62 48 65 52C68 48 72 46 76 46C83 46 89 51 89 58C89 70 75 79 60 88" fill="#D9826B" />
      </svg>
    </div>
  );
}

function AuthedExperience() {
  return (
    <>
      <ZommyIntro />
      <HomeRitualScreen />
      <FamilyCircleHomeLayer />
      <TimelineScreen />
      <ChaptersLibrary />
      <ChapterScreen />
      <CompareScreen />
      <SettingsScreen />
      <FamilySharingScreen />
      <FamilySharingEntryLayer />
      <ChildProfileCreator />
      <FirstRunExperience />
      <NavExperienceLayer />
      <MemoryComposer />
      <MemorySavedToast />
      <NotificationControlsLayer />
      <AccessibilitySafetyLayer />
      <PWAExperienceLayer />
      <ResumeRecoveryLayer />
    </>
  );
}

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const { ensureDefaultPrimaryScreen, hasPrimaryScreen } = useAppShell();

  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] || COPY.en;
  const user = session?.user || null;
  const dark = prefs.theme === "night";
  const bg = dark ? "#18120F" : "#FFF4E8";
  const text = dark ? "#FFF7EF" : "#3A2A22";
  const sub = dark ? "rgba(255,247,239,0.68)" : "#80695B";
  const border = dark ? "rgba(255,244,232,0.14)" : "rgba(122,77,57,0.18)";

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const updatePrefs = (next) => {
    setPrefs(next);
    savePrefs(next);
    window.dispatchEvent(new CustomEvent("zommy:prefs-changed", { detail: next }));
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) { setSession(data.session || null); setLoading(false); } })
      .catch(() => { if (mounted) { setSession(null); setLoading(false); } });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setLoading(false);
      setSaving(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user) ensureDefaultPrimaryScreen();
  }, [ensureDefaultPrimaryScreen, user]);

  const signIn = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } } });
    if (error) { showToast(authMessage(error, copy)); setSaving(false); }
  };

  const signOut = async () => {
    setSaving(true);
    await supabase.auth.signOut();
    setSession(null);
    setSaving(false);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body{background:#FFF4E8;overscroll-behavior:none}
    button,input,textarea,select{font:inherit}
    .b{transition:transform .12s,opacity .12s}.b:active{transform:scale(.98);opacity:.86}
  `;

  if (loading) {
    return (
      <>
        <InviteAcceptanceLayer />
        <Shell bg={bg} text={text} css={css}>
          <div style={{ color: sub, fontFamily: "Lora, Georgia, serif", fontStyle: "italic" }}>{copy.loading}</div>
        </Shell>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <InviteAcceptanceLayer />
        <Shell bg={bg} text={text} css={css}>
          {toast && <Toast message={toast} dark={dark} bottom={32} />}
          <div style={{ width: "100%", maxWidth: 370, display: "grid", gap: 22, textAlign: "center", padding: "32px 24px" }}>
            <div style={{ justifySelf: "center" }}><BrandMark /></div>
            <div><h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 32, lineHeight: 1.12, fontWeight: 650 }}>{copy.title}</h1><p style={{ color: sub, fontSize: 15, lineHeight: 1.7, marginTop: 10 }}>{copy.body}</p></div>
            <button className="b" disabled={saving} onClick={signIn} style={{ border: `1px solid ${border}`, background: "#D9826B", color: "#FFFDF7", borderRadius: 18, padding: "16px 18px", fontWeight: 900, cursor: saving ? "wait" : "pointer", boxShadow: "0 14px 34px rgba(217,130,107,0.22)" }}>{saving ? copy.signing : copy.cta}</button>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>{["en", "pt"].map((lang) => <button key={lang} className="b" onClick={() => updatePrefs({ ...prefs, lang })} style={{ border: `1px solid ${prefs.lang === lang ? "#D9826B" : border}`, background: prefs.lang === lang ? "rgba(217,130,107,0.12)" : "transparent", color: prefs.lang === lang ? "#D9826B" : sub, borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 800 }}>{lang === "en" ? "English" : "Português"}</button>)}</div>
          </div>
        </Shell>
      </>
    );
  }

  const name = user.user_metadata?.full_name || user.email || "";
  const avatar = user.user_metadata?.avatar_url;

  return (
    <>
      <InviteAcceptanceLayer />
      <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
        <style>{css}</style>
        {toast && <Toast message={toast} dark={dark} bottom={100} />}
        <header style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 120, width: "100%", maxWidth: 480, minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: dark ? "rgba(24,18,15,.78)" : "rgba(255,244,232,.86)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${border}` }}>
          <div aria-label="Zommy" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 24, fontWeight: 900, letterSpacing: "-.8px" }}><BrandMark size={38} /><span>Zommy</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(217,130,107,.16)", color: "#D9826B", display: "grid", placeItems: "center", fontWeight: 900 }}>{name.slice(0,1).toUpperCase()}</div>}
            <button className="b" disabled={saving} onClick={signOut} style={{ border: `1px solid ${border}`, background: dark ? "rgba(255,244,232,.07)" : "rgba(255,255,255,.58)", color: sub, borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>{copy.signOut}</button>
          </div>
        </header>
        <main style={{ minHeight: "100dvh", paddingTop: 68, paddingBottom: 100 }}>
          {!hasPrimaryScreen && <div style={{ minHeight: "calc(100dvh - 168px)", display: "grid", placeItems: "center", padding: "24px", color: sub, textAlign: "center", lineHeight: 1.55 }}>Choose a tab below or add a child to begin.</div>}
        </main>
      </div>
      <AuthedExperience />
      <SpeedInsights />
      <Analytics />
    </>
  );
}

function Shell({ bg, text, css, children }) {
  return <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}><style>{css}</style>{children}</div>;
}

function Toast({ message, dark, bottom }) {
  return <div style={{ position: "fixed", bottom, left: "50%", transform: "translateX(-50%)", zIndex: 2400, background: dark ? "#FFF7EF" : "#3A2A22", color: dark ? "#3A2A22" : "#FFF7EF", padding: "10px 20px", borderRadius: 18, fontSize: 13, fontWeight: 800, maxWidth: "min(90vw,420px)", textAlign: "center", boxShadow: "0 4px 20px rgba(122,77,57,0.2)" }}>{message}</div>;
}
