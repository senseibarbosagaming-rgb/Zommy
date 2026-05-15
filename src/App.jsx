import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const DEFAULT_PREFS = { lang: "en", theme: "dark" };
const COPY = {
  en: { loading: "Loading…", title: "Keep every memory private.", body: "Sign in with Google to save your family timeline securely.", cta: "Continue with Google", signing: "Opening Google…", signOut: "Sign out", authError: "Could not sign in", providerError: "Google login is not enabled in Supabase yet." },
  pt: { loading: "A carregar…", title: "Mantém cada memória privada.", body: "Inicia sessão com o Google para guardar a timeline da família em segurança.", cta: "Continuar com Google", signing: "A abrir o Google…", signOut: "Terminar sessão", authError: "Não foi possível iniciar sessão", providerError: "O login com Google ainda não está ativo no Supabase." },
};

const loadPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("zommy_prefs") || "{}") }; }
  catch { return DEFAULT_PREFS; }
};
const savePrefs = (prefs) => localStorage.setItem("zommy_prefs", JSON.stringify(prefs));

const authMessage = (error, copy) => {
  const text = `${error?.message || ""} ${error?.error_code || ""}`.toLowerCase();
  return text.includes("provider") ? copy.providerError : copy.authError;
};

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] || COPY.en;
  const user = session?.user || null;
  const dark = prefs.theme !== "light";
  const bg = dark ? "#101418" : "#f8f6f3";
  const text = dark ? "#f5f7fb" : "#111111";
  const sub = dark ? "rgba(255,255,255,0.64)" : "#666666";
  const border = dark ? "rgba(255,255,255,0.12)" : "#e8e4df";

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const updatePrefs = (next) => {
    setPrefs(next);
    savePrefs(next);
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
    html,body{background:#43596a;overscroll-behavior:none}
    button,input,textarea,select{font:inherit}
    .b{transition:transform .12s,opacity .12s}.b:active{transform:scale(.98);opacity:.86}
  `;

  if (loading) return <Shell bg={bg} text={text} css={css}><div style={{ color: sub, fontFamily: "Lora, Georgia, serif", fontStyle: "italic" }}>{copy.loading}</div></Shell>;

  if (!user) {
    return (
      <Shell bg={bg} text={text} css={css}>
        {toast && <Toast message={toast} dark={dark} bottom={32} />}
        <div style={{ width: "100%", maxWidth: 360, display: "grid", gap: 22, textAlign: "center", padding: "32px 24px" }}>
          <div style={{ justifySelf: "center", width: 92, height: 92, borderRadius: 28, background: "linear-gradient(135deg,#60A5FA,#34D399)", display: "grid", placeItems: "center", fontSize: 42 }}>Z</div>
          <div><h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 30, lineHeight: 1.15 }}>{copy.title}</h1><p style={{ color: sub, fontSize: 15, lineHeight: 1.7, marginTop: 10 }}>{copy.body}</p></div>
          <button className="b" disabled={saving} onClick={signIn} style={{ border: `1px solid ${border}`, background: text, color: bg, borderRadius: 14, padding: "15px 18px", fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>{saving ? copy.signing : copy.cta}</button>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>{["en", "pt"].map((lang) => <button key={lang} className="b" onClick={() => updatePrefs({ ...prefs, lang })} style={{ border: `1px solid ${prefs.lang === lang ? text : border}`, background: "transparent", color: prefs.lang === lang ? text : sub, borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 800 }}>{lang === "en" ? "English" : "Português"}</button>)}</div>
        </div>
      </Shell>
    );
  }

  const name = user.user_metadata?.full_name || user.email || "";
  const avatar = user.user_metadata?.avatar_url;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      <style>{css}</style>
      {toast && <Toast message={toast} dark={dark} bottom={100} />}
      <header style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 120, width: "100%", maxWidth: 480, minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: dark ? "rgba(16,20,24,.78)" : "rgba(248,246,243,.84)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${border}` }}>
        <div aria-label="Zommy" style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.8px" }}>Zommy</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "grid", placeItems: "center", fontWeight: 900 }}>{name.slice(0,1).toUpperCase()}</div>}
          <button className="b" disabled={saving} onClick={signOut} style={{ border: `1px solid ${border}`, background: "rgba(255,255,255,.05)", color: sub, borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>{copy.signOut}</button>
        </div>
      </header>
      <main style={{ minHeight: "100dvh", paddingTop: 68, paddingBottom: 100 }} />
    </div>
  );
}

function Shell({ bg, text, css, children }) {
  return <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}><style>{css}</style>{children}</div>;
}

function Toast({ message, dark, bottom }) {
  return <div style={{ position: "fixed", bottom, left: "50%", transform: "translateX(-50%)", zIndex: 2400, background: dark ? "#fff" : "#111", color: dark ? "#111" : "#fff", padding: "10px 20px", borderRadius: 18, fontSize: 13, fontWeight: 800, maxWidth: "min(90vw,420px)", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>{message}</div>;
}
