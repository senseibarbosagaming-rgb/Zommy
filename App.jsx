// App.jsx — updated global styles and token-driven surfaces for Milk & Stone

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAppShell } from "./AppShellContext";
import { getPrefs, savePrefs, dispatchPrefsChanged } from "./prefs";
import { palette, type } from "./designSystem";

// Screens — only one is rendered at a time
import HomeRitualScreen      from "./HomeRitualScreen";
import TimelineScreen        from "./TimelineScreen";
import CompareScreen         from "./CompareScreen";
import FamilySharingScreen   from "./FamilySharingScreen";
import SettingsScreen        from "./SettingsScreen";

// Overlays — always mounted, float above whichever screen is active
import ZommyIntro            from "./ZommyIntro";
import MemoryComposer        from "./MemoryComposer";
import MemorySavedToast      from "./MemorySavedToast";
import ChildProfileCreator   from "./ChildProfileCreator";
import FirstRunExperience    from "./FirstRunExperience";
import NavExperienceLayer    from "./NavExperienceLayer";
import NotificationControlsLayer from "./NotificationControlsLayer";
import AccessibilitySafetyLayer  from "./AccessibilitySafetyLayer";
import PWAExperienceLayer        from "./PWAExperienceLayer";
import ResumeRecoveryLayer       from "./ResumeRecoveryLayer";
import InviteAcceptanceLayer     from "./InviteAcceptanceLayer";
import FamilyCircleHomeLayer     from "./FamilyCircleHomeLayer";
import FamilySharingEntryLayer   from "./FamilySharingEntryLayer";
// Chapter screens are event-triggered overlays (zommy:show-chapter / zommy:show-chapters)
// not primary tab screens, so they stay always-mounted like modals
import ChapterScreen         from "./ChapterScreen";
import ChaptersLibrary       from "./ChaptersLibrary";

import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics }     from "@vercel/analytics/react";

// ─── i18n ─────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    loading:       "Loading…",
    title:         "A calm place for family memories.",
    body:          "Sign in with Google to save your child's story privately, one small moment at a time.",
    cta:           "Continue with Google",
    signing:       "Opening Google…",
    signOut:       "Sign out",
    authError:     "Could not sign in",
    providerError: "Google login is not enabled in Supabase yet.",
  },
  pt: {
    loading:       "A carregar…",
    title:         "Um lugar calmo para as memórias da família.",
    body:          "Inicia sessão com o Google para guardar a história da tua criança em privado, um momento de cada vez.",
    cta:           "Continuar com Google",
    signing:       "A abrir o Google…",
    signOut:       "Terminar sessão",
    authError:     "Não foi possível iniciar sessão",
    providerError: "O login com Google ainda não está ativo no Supabase.",
  },
};

const authMessage = (error, copy) => {
  const text = `${error?.message || ""} ${error?.error_code || ""}`.toLowerCase();
  return text.includes("provider") ? copy.providerError : copy.authError;
};

// ─── global CSS (built from tokens) ───────────────────────────────────────────
const GLOBAL_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap');

:root{
  --color-milk: ${palette.milk};
  --color-surface: ${palette.surface};
  --color-stone: ${palette.stone};
  --color-muted: ${palette.muted};
  --color-accent: ${palette.accent};
  --shadow: ${palette.shadow};
  --shadow-soft: ${palette.shadowSoft};
  --radius: 20px;
  --gap: 24px;
  --hpad: 20px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

html, body {
  background: var(--color-milk);
  color: var(--color-stone);
  font-family: ${type.sans};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
}

h1,h2,h3,h4 { font-family: ${type.serif}; font-weight: 700; color: var(--color-stone); margin: 0; }

button, input, textarea, select { font: inherit; }

/* Interactive press effect — add className="b" to any tappable element */
.b { transition: transform .14s ease, opacity .14s ease, box-shadow .14s ease; }
.b:active { transform: scale(.992); opacity: .94; }
.b:focus-visible { outline: 3px solid rgba(193,123,92,0.18); outline-offset: 2px; }

/* Primary screen enter animation */
.zommy-primary-screen { animation: zommy-screen-enter .22s cubic-bezier(.2,.8,.2,1) both; will-change: transform, opacity; }

/* Card hover/press effects */
.zommy-elevated-card { transition: transform .16s ease, opacity .16s ease, box-shadow .16s ease; }
.zommy-elevated-card:active { transform: scale(.992); opacity: .96; }

@keyframes zommy-screen-enter { from { opacity: .01; transform: translate3d(0, 10px, 0) scale(.992); } to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } }

@media (prefers-reduced-motion: reduce) { .b, .zommy-primary-screen, .zommy-elevated-card { transition: none !important; animation: none !important; } }

/* Layout helpers */
.container-center { max-width: 480px; margin: 0 auto; padding: 0 var(--hpad); }

/* Small utilities */
.visually-hidden { position: absolute !important; height: 1px; width: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; }
`;

function injectGlobalStyles() {
  if (document.getElementById("zommy-global-css")) return;
  const style = document.createElement("style");
  style.id = "zommy-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// ─── BrandMark — simplified, token-driven mark ───────────────────────────────
function BrandMark({ size = 92 }) {
  const r = Math.round(size * 0.32);
  const tone = palette.accent;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size,
        borderRadius: r,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadowSoft,
        display: "grid", placeItems: "center",
        position: "relative", overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 120 120" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} fill="none" aria-hidden="true">
        <rect x="18" y="26" width="84" height="68" rx="10" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="72" r="10" fill={tone} />
      </svg>
    </div>
  );
}

// ─── Toast — token-driven colors
function Toast({ message, bottom = 32 }) {
  return (
    <div style={{
      position: "fixed", bottom, left: "50%", transform: "translateX(-50%)",
      zIndex: 2400,
      background: palette.stone,
      color: palette.surface,
      padding: "10px 20px", borderRadius: 18,
      fontSize: 13, fontWeight: 700,
      maxWidth: "min(90vw, 420px)", textAlign: "center",
      boxShadow: palette.shadowSoft,
    }}>{message}</div>
  );
}

// ─── ScreenRenderer ────────────────────────────────────────────────────────
function ScreenRenderer({ activeScreen }) {
  switch (activeScreen) {
    case "today":    return <HomeRitualScreen />;
    case "timeline": return <TimelineScreen />;
    case "compare":  return <CompareScreen />;
    case "family":   return <FamilySharingScreen />;
    case "settings": return <SettingsScreen />;
    default:         return null;
  }
}

// ─── AlwaysOnLayers ────────────────────────────────────────────────────────
function AlwaysOnLayers() {
  return (
    <>
      <ZommyIntro />
      <MemoryComposer />
      <MemorySavedToast />
      <ChildProfileCreator />
      <FirstRunExperience />
      <FamilyCircleHomeLayer />
      <NavExperienceLayer />
      <FamilySharingEntryLayer />
      <NotificationControlsLayer />
      <AccessibilitySafetyLayer />
      <PWAExperienceLayer />
      <ResumeRecoveryLayer />
    </>
  );
}

// ─── Authenticated shell — token-driven surfaces and header ────────────────
function AuthenticatedApp({ user, prefs, onPrefsChange, onSignOut, saving, toast }) {
  const { activeScreen, hasPrimaryScreen } = useAppShell();

  const name   = user.user_metadata?.full_name || user.email || "";
  const avatar = user.user_metadata?.avatar_url;

  return (
    <div style={{
      fontFamily: type.sans,
      background: palette.milk,
      color: palette.stone,
      minHeight: "100dvh",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      {toast && <Toast message={toast} bottom={100} />}

      {/* App header */}
      <header style={{
        position: "fixed",
        top: 0, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        width: "100%", maxWidth: 480,
        minHeight: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: palette.surface,
        boxShadow: palette.shadow,
        borderBottom: `1px solid ${palette.border}`,
      }}>
        <div aria-label="Zommy" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 700 }}>
          <BrandMark size={38} />
          <span style={{ fontFamily: type.serif, fontSize: 18 }}>Zommy</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {avatar
            ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.04)", color: palette.accent, display: "grid", placeItems: "center", fontWeight: 700 }}>{name.slice(0, 1).toUpperCase()}</div>
          }
          <button
            className="b"
            disabled={saving}
            onClick={onSignOut}
            style={{
              border: `1px solid ${palette.border}`,
              background: "transparent",
              color: palette.muted,
              borderRadius: 999, padding: "8px 10px",
              fontSize: 12, fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {COPY[prefs.lang === "pt" ? "pt" : "en"]?.signOut ?? "Sign out"}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main style={{ minHeight: "100dvh", paddingTop: 68, paddingBottom: 100 }}>
        {!hasPrimaryScreen && (
          <div style={{ minHeight: "calc(100dvh - 168px)", display: "grid", placeItems: "center", padding: "24px", color: palette.muted, textAlign: "center", lineHeight: 1.55 }}>
            Choose a tab below or add a child to begin.
          </div>
        )}
        <ScreenRenderer activeScreen={activeScreen} />
      </main>

      {/* Chapter screens */}
      <ChapterScreen />
      <ChaptersLibrary />

      {/* Overlays */}
      <AlwaysOnLayers />
    </div>
  );
}

// ─── App root ──────────────────────────────────────────────────────────────
export default function App() {
  const [prefs, setPrefs]   = useState(getPrefs);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");

  const { ensureDefaultPrimaryScreen } = useAppShell();

  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] ?? COPY.en;
  const user = session?.user ?? null;

  // Inject global CSS once on mount
  useEffect(() => { injectGlobalStyles(); }, []);

  // Auth session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) { setSession(data.session ?? null); setLoading(false); }
      })
      .catch(() => {
        if (mounted) { setSession(null); setLoading(false); }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
      setSaving(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Open default screen when user logs in
  useEffect(() => { if (user) ensureDefaultPrimaryScreen(); }, [ensureDefaultPrimaryScreen, user]);

  // Toast helper
  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };

  const updatePrefs = (next) => { setPrefs(next); const saved = savePrefs(next); dispatchPrefsChanged(saved); };

  const signIn = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } }, });
    if (error) { showToast(authMessage(error, copy)); setSaving(false); }
  };

  const signOut = async () => { setSaving(true); await supabase.auth.signOut(); setSession(null); setSaving(false); };

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div style={{ fontFamily: type.sans, background: palette.milk, color: palette.stone, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}>
          <div style={{ color: palette.muted, fontFamily: type.serif, fontStyle: "italic" }}>{copy.loading}</div>
        </div>
      </>
    );
  }

  // ── Sign-in screen ──
  if (!user) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div style={{ fontFamily: type.sans, background: palette.milk, color: palette.stone, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}>
          {toast && <Toast message={toast} bottom={32} />}

          <div style={{ width: "100%", maxWidth: 370, display: "grid", gap: 22, textAlign: "center", padding: "32px 20px" }}>
            <div style={{ justifySelf: "center" }}><BrandMark /></div>

            <div>
              <h1 style={{ fontFamily: type.serif, fontSize: 32, lineHeight: 1.12, fontWeight: 700 }}>{copy.title}</h1>
              <p style={{ color: palette.muted, fontSize: 15, lineHeight: 1.7, marginTop: 10 }}>{copy.body}</p>
            </div>

            <button className="b" disabled={saving} onClick={signIn} style={{ border: `1px solid ${palette.border}`, background: palette.accent, color: palette.surface, borderRadius: 18, padding: "16px 18px", fontWeight: 700, cursor: saving ? "wait" : "pointer", boxShadow: palette.shadowSoft }}>
              {saving ? copy.signing : copy.cta}
            </button>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              { ["en","pt"].map((lang) => (
                <button key={lang} className="b" onClick={() => updatePrefs({ ...prefs, lang })} style={{ border: `1px solid ${prefs.lang === lang ? palette.accent : palette.border}`, background: prefs.lang === lang ? `${palette.accent}10` : "transparent", color: prefs.lang === lang ? palette.accent : palette.muted, borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 700 }}>{lang === "en" ? "English" : "Português"}</button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Authenticated app ──
  return (
    <>
      <InviteAcceptanceLayer />
      <AuthenticatedApp user={user} prefs={prefs} onPrefsChange={updatePrefs} onSignOut={signOut} saving={saving} toast={toast} />
      <SpeedInsights />
      <Analytics />
    </>
  );
}
