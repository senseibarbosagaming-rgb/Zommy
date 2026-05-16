// App.jsx
//
// WHAT CHANGED vs the old version
// ─────────────────────────────────────────────────────────────────────────────
// BEFORE: AuthedExperience rendered ALL screens simultaneously as a flat pile
//         of fixed-position layers. Every screen was always mounted, always
//         running hooks, and toggled via its own internal `open` state driven
//         by window events. The header lived here but was visually buried
//         under all the z-index:900+ screens.
//
// AFTER:
//   1. <ScreenRenderer> renders ONLY the active screen — one component in the
//      DOM at a time. Unmounting inactive screens stops all their data hooks,
//      prevents state drift, and kills the "screen doesn't open" race condition.
//
//   2. The authenticated layout is now a proper shell: a fixed header at the
//      top, the active screen fills the space, the bottom nav sits on top.
//      No more competing fixed layers.
//
//   3. Overlay components that should ALWAYS be mounted (MemoryComposer,
//      MemorySavedToast, ChildProfileCreator, etc.) stay in <AlwaysOnLayers>.
//      These are not screens — they're modals/toasts that float over any screen.
//
//   4. App-level concerns (session, prefs, global CSS) remain here. The header
//      is now part of the real document flow for the auth screen, and hidden
//      behind the shell header when authenticated.
//
//   5. The sign-in page and loading states are unchanged visually.
//
// Migration notes for screen components (HomeRitualScreen, TimelineScreen, etc.)
// ─────────────────────────────────────────────────────────────────────────────
//   - You can REMOVE the useEffect that listened for zommy:show-X / zommy:hide-X
//     and the `open` state it toggled. The component now only mounts when active.
//   - You can REMOVE the `if (!open || !user) return null` guard at the top.
//   - Everything else (data hooks, UI, event dispatching) stays exactly the same.
//   - This is optional — the old pattern still works as a no-op since the
//     component won't be mounted at all when inactive. But cleaning it up reduces
//     unnecessary hook registrations.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── global CSS ───────────────────────────────────────────────────────────────
// Injected once via a <style> tag in the document head so it doesn't re-inject
// on every render.

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Inter:wght@400;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  background: #FBF7F0;
  overscroll-behavior: none;
}

button, input, textarea, select {
  font: inherit;
}

/* Interactive press effect — add className="b" to any tappable element */
.b {
  transition: transform .14s ease, opacity .14s ease, box-shadow .14s ease;
}
.b:active {
  transform: scale(.985);
  opacity: .88;
}
.b:focus-visible {
  outline: 3px solid rgba(185,120,95,.28);
  outline-offset: 2px;
}

/* Primary screen enter animation */
.zommy-primary-screen {
  animation: zommy-screen-enter .22s cubic-bezier(.2,.8,.2,1) both;
  will-change: transform, opacity;
}

/* Card hover/press effects */
.zommy-elevated-card {
  transition: transform .16s ease, opacity .16s ease, box-shadow .16s ease;
}
.zommy-elevated-card:active {
  transform: scale(.985);
  opacity: .92;
}

/* Glass card style */
.zommy-glass {
  background: rgba(255,253,248,.76);
  border: 1px solid rgba(122,77,57,.14);
  box-shadow: 0 16px 44px rgba(122,77,57,.10);
  backdrop-filter: blur(18px);
}

@keyframes zommy-screen-enter {
  from { opacity: .01; transform: translate3d(0, 10px, 0) scale(.992); }
  to   { opacity: 1;   transform: translate3d(0, 0,    0) scale(1);    }
}

@media (prefers-reduced-motion: reduce) {
  .b, .zommy-primary-screen, .zommy-elevated-card {
    transition: none !important;
    animation: none !important;
  }
}
`;

function injectGlobalStyles() {
  if (document.getElementById("zommy-global-css")) return;
  const style = document.createElement("style");
  style.id = "zommy-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// ─── BrandMark ────────────────────────────────────────────────────────────────

function BrandMark({ size = 92 }) {
  const r = Math.round(size * 0.32);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size,
        borderRadius: r,
        background: "linear-gradient(145deg,#FFFDF7,#FFE2D1)",
        border: "1px solid rgba(122,77,57,0.14)",
        boxShadow: "0 22px 54px rgba(122,77,57,0.18)",
        display: "grid", placeItems: "center",
        position: "relative", overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        width: size * 1.15, height: size * 1.15,
        borderRadius: "50%",
        background: "rgba(143,185,168,0.18)",
        transform: `translate(${-size * 0.34}px, ${-size * 0.34}px)`,
      }} />
      <svg
        viewBox="0 0 120 120"
        width={Math.round(size * 0.64)}
        height={Math.round(size * 0.64)}
        fill="none"
        style={{ position: "relative" }}
      >
        <path d="M24 58L60 30L96 58"     stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 54V92H84V54"         stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 84C49 76 42 68 42 58C42 51 48 46 55 46C59 46 62 48 65 52C68 48 72 46 76 46C83 46 89 51 89 58C89 70 75 79 60 88" fill="#D9826B" />
      </svg>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, dark, bottom = 32 }) {
  return (
    <div style={{
      position: "fixed", bottom, left: "50%", transform: "translateX(-50%)",
      zIndex: 2400,
      background: dark ? "#FFF7EF" : "#3A2A22",
      color:      dark ? "#3A2A22" : "#FFF7EF",
      padding: "10px 20px", borderRadius: 18,
      fontSize: 13, fontWeight: 800,
      maxWidth: "min(90vw, 420px)", textAlign: "center",
      boxShadow: "0 4px 20px rgba(122,77,57,0.2)",
    }}>
      {message}
    </div>
  );
}

// ─── ScreenRenderer ───────────────────────────────────────────────────────────
// Renders ONLY the active screen. All other screens are unmounted.
// This is the core fix: one screen in the DOM at a time.

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

// ─── AlwaysOnLayers ───────────────────────────────────────────────────────────
// Components that must stay mounted regardless of which screen is active.
// These are modals, toasts, and background utilities — not screens.

function AlwaysOnLayers() {
  return (
    <>
      {/* Intro animation — renders once per session, then self-destructs */}
      <ZommyIntro />

      {/* Modal overlays — triggered by window events from any screen */}
      <MemoryComposer />
      <MemorySavedToast />
      <ChildProfileCreator />
      <FirstRunExperience />

      {/* Family sharing pill shown over Today screen */}
      <FamilyCircleHomeLayer />

      {/* Bottom navigation bar */}
      <NavExperienceLayer />

      {/* Settings injection layer for Family Sharing entry point */}
      <FamilySharingEntryLayer />

      {/* Background utilities — render nothing, just run effects */}
      <NotificationControlsLayer />
      <AccessibilitySafetyLayer />
      <PWAExperienceLayer />
      <ResumeRecoveryLayer />
    </>
  );
}

// ─── Authenticated shell ──────────────────────────────────────────────────────

function AuthenticatedApp({ user, prefs, onPrefsChange, onSignOut, saving, toast, dark }) {
  const { activeScreen, hasPrimaryScreen } = useAppShell();

  const name   = user.user_metadata?.full_name || user.email || "";
  const avatar = user.user_metadata?.avatar_url;

  const bg     = dark ? "#18120F" : palette.parchment;
  const text   = dark ? "#FFF7EF" : palette.ink;
  const sub    = dark ? "rgba(255,247,239,0.68)" : palette.inkMuted;
  const border = dark ? "rgba(255,244,232,0.14)" : palette.border;

  return (
    <div style={{
      fontFamily: type.sans,
      background: `radial-gradient(circle at 12% -8%, rgba(227,184,92,.22), transparent 32%),
                   radial-gradient(circle at 100% 0%, rgba(127,169,149,.16), transparent 34%),
                   ${bg}`,
      color: text,
      minHeight: "100dvh",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      {toast && <Toast message={toast} dark={dark} bottom={100} />}

      {/* App header — fixed at top of the 480px column */}
      <header style={{
        position: "fixed",
        top: 0, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        width: "100%", maxWidth: 480,
        minHeight: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        background: dark ? "rgba(24,18,15,.78)" : "rgba(255,253,248,.88)",
        backdropFilter: "blur(18px)",
        borderBottom: `1px solid ${border}`,
      }}>
        <div
          aria-label="Zommy"
          style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 24, fontWeight: 900, letterSpacing: "-.8px" }}
        >
          <BrandMark size={38} />
          <span>Zommy</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {avatar
            ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(217,130,107,.16)", color: "#D9826B", display: "grid", placeItems: "center", fontWeight: 900 }}>
                {name.slice(0, 1).toUpperCase()}
              </div>
          }
          <button
            className="b"
            disabled={saving}
            onClick={onSignOut}
            style={{
              border: `1px solid ${border}`,
              background: dark ? "rgba(255,244,232,.07)" : "rgba(255,255,255,.58)",
              color: sub,
              borderRadius: 999, padding: "8px 10px",
              fontSize: 12, fontWeight: 800,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {COPY[prefs.lang === "pt" ? "pt" : "en"]?.signOut ?? "Sign out"}
          </button>
        </div>
      </header>

      {/* Main content area — active screen renders here */}
      <main style={{ minHeight: "100dvh", paddingTop: 68, paddingBottom: 100 }}>
        {!hasPrimaryScreen && (
          <div style={{
            minHeight: "calc(100dvh - 168px)",
            display: "grid", placeItems: "center",
            padding: "24px", color: sub,
            textAlign: "center", lineHeight: 1.55,
          }}>
            Choose a tab below or add a child to begin.
          </div>
        )}
        {/* Only the active screen is rendered — this is the key change */}
        <ScreenRenderer activeScreen={activeScreen} />
      </main>

      {/* Chapter screens — event-triggered overlays, not tab screens */}
      <ChapterScreen />
      <ChaptersLibrary />

      {/* Overlays and utilities — always mounted */}
      <AlwaysOnLayers />
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [prefs, setPrefs]   = useState(getPrefs);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");

  const { ensureDefaultPrimaryScreen } = useAppShell();

  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] ?? COPY.en;
  const user = session?.user ?? null;
  const dark = prefs.theme === "night";

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
  useEffect(() => {
    if (user) ensureDefaultPrimaryScreen();
  }, [ensureDefaultPrimaryScreen, user]);

  // Toast helper
  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const updatePrefs = (next) => {
    setPrefs(next);
    const saved = savePrefs(next);
    dispatchPrefsChanged(saved);
  };

  const signIn = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
    });
    if (error) { showToast(authMessage(error, copy)); setSaving(false); }
  };

  const signOut = async () => {
    setSaving(true);
    await supabase.auth.signOut();
    setSession(null);
    setSaving(false);
  };

  const bg     = dark ? "#18120F" : palette.parchment;
  const text   = dark ? "#FFF7EF" : palette.ink;
  const sub    = dark ? "rgba(255,247,239,0.68)" : palette.inkMuted;
  const border = dark ? "rgba(255,244,232,0.14)" : palette.border;

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div style={{ fontFamily: type.sans, background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}>
          <div style={{ color: sub, fontFamily: type.serif, fontStyle: "italic" }}>{copy.loading}</div>
        </div>
      </>
    );
  }

  // ── Sign-in screen ──
  if (!user) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div style={{ fontFamily: type.sans, background: bg, color: text, minHeight: "100dvh", maxWidth: 480, margin: "0 auto", display: "grid", placeItems: "center" }}>
          {toast && <Toast message={toast} dark={dark} bottom={32} />}

          <div style={{ width: "100%", maxWidth: 370, display: "grid", gap: 22, textAlign: "center", padding: "32px 24px" }}>
            <div style={{ justifySelf: "center" }}>
              <BrandMark />
            </div>

            <div>
              <h1 style={{ fontFamily: type.serif, fontSize: 32, lineHeight: 1.12, fontWeight: 650 }}>
                {copy.title}
              </h1>
              <p style={{ color: sub, fontSize: 15, lineHeight: 1.7, marginTop: 10 }}>
                {copy.body}
              </p>
            </div>

            <button
              className="b"
              disabled={saving}
              onClick={signIn}
              style={{
                border: `1px solid ${border}`,
                background: "#D9826B", color: "#FFFDF7",
                borderRadius: 18, padding: "16px 18px",
                fontWeight: 900,
                cursor: saving ? "wait" : "pointer",
                boxShadow: "0 14px 34px rgba(217,130,107,0.22)",
              }}
            >
              {saving ? copy.signing : copy.cta}
            </button>

            {/* Language switcher */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {["en", "pt"].map((lang) => (
                <button
                  key={lang}
                  className="b"
                  onClick={() => updatePrefs({ ...prefs, lang })}
                  style={{
                    border: `1px solid ${prefs.lang === lang ? "#D9826B" : border}`,
                    background: prefs.lang === lang ? "rgba(217,130,107,0.12)" : "transparent",
                    color: prefs.lang === lang ? "#D9826B" : sub,
                    borderRadius: 999, padding: "9px 13px",
                    fontSize: 13, fontWeight: 800,
                  }}
                >
                  {lang === "en" ? "English" : "Português"}
                </button>
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
      <AuthenticatedApp
        user={user}
        prefs={prefs}
        onPrefsChange={updatePrefs}
        onSignOut={signOut}
        saving={saving}
        toast={toast}
        dark={dark}
      />
      <SpeedInsights />
      <Analytics />
    </>
  );
}
