import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './supabase';
import { useAppShell } from './AppShellContext';
import { getPrefs, savePrefs, dispatchPrefsChanged } from './prefs';
import { palette, type } from './designSystem';
import HomeRitualScreen from './HomeRitualScreen';
import TimelineScreen from './TimelineScreen';
import CompareScreen from './CompareScreen';
import FamilySharingScreen from './FamilySharingScreen';
import SettingsScreen from './SettingsScreen';
import ZommyIntro from './ZommyIntro';
import MemoryComposer from './MemoryComposer';
import MemorySavedToast from './MemorySavedToast';
import ChildProfileCreator from './ChildProfileCreator';
import FirstRunExperience from './FirstRunExperience';
import NavExperienceLayer from './NavExperienceLayer';
import NotificationControlsLayer from './NotificationControlsLayer';
import AccessibilitySafetyLayer from './AccessibilitySafetyLayer';
import PWAExperienceLayer from './PWAExperienceLayer';
import ResumeRecoveryLayer from './ResumeRecoveryLayer';
import InviteAcceptanceLayer from './InviteAcceptanceLayer';
import FamilyCircleHomeLayer from './FamilyCircleHomeLayer';
import FamilySharingEntryLayer from './FamilySharingEntryLayer';
import ChapterScreen from './ChapterScreen';
import ChaptersLibrary from './ChaptersLibrary';

const COPY = {
  en: {
    loading: 'Loading…',
    title: 'A calm place for family memories.',
    body: "Sign in with Google to save your child's story privately, one small moment at a time.",
    cta: 'Continue with Google',
    signing: 'Opening Google…',
    signOut: 'Sign out',
    authError: 'Could not sign in',
    providerError: 'Google login is not enabled in Supabase yet.',
  },
  pt: {
    loading: 'A carregar…',
    title: 'Um lugar calmo para as memórias da família.',
    body: 'Inicia sessão com o Google para guardar a história da tua criança em privado, um momento de cada vez.',
    cta: 'Continuar com Google',
    signing: 'A abrir o Google…',
    signOut: 'Terminar sessão',
    authError: 'Não foi possível iniciar sessão',
    providerError: 'O login com Google ainda não está ativo no Supabase.',
  },
};

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { background: var(--z-bg); color: var(--z-text); font-family: var(--z-sans); -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
button, input, textarea, select { font: inherit; }
.b { transition: transform .12s ease, opacity .12s ease; }
.b:active { transform: scale(.975); opacity: .85; }
.b:focus-visible { outline: 2px solid var(--z-accent); outline-offset: 3px; }
.zommy-primary-screen { animation: screen-enter .2s cubic-bezier(.2,.8,.2,1) both; }
.zommy-elevated-card { transition: transform .14s ease, box-shadow .14s ease; }
.zommy-elevated-card:active { transform: scale(.978); }
@keyframes screen-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toast-enter { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .b, .zommy-primary-screen, .zommy-elevated-card { transition: none !important; animation: none !important; } }
`;

const authMessage = (error, copy) => {
  const text = `${error?.message || ''} ${error?.error_code || ''}`.toLowerCase();
  return text.includes('provider') ? copy.providerError : copy.authError;
};

const injectGlobalStyles = () => {
  if (document.getElementById('zommy-global-css')) return;
  const style = document.createElement('style');
  style.id = 'zommy-global-css';
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
};

function BrandMark({ size = 80 }) {
  return (
    <div aria-hidden="true" style={brandMarkStyle(size)}>
      <svg viewBox="0 0 120 120" width={Math.round(size * 0.64)} height={Math.round(size * 0.64)} fill="none">
        <path d="M24 58L60 30L96 58" stroke={palette.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 54V92H84V54" stroke={palette.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 84C49 76 42 68 42 58C42 51 48 46 55 46C59 46 62 48 65 52C68 48 72 46 76 46C83 46 89 51 89 58C89 70 75 79 60 88" fill={palette.accent} />
      </svg>
    </div>
  );
}

function Toast({ message }) {
  return <div style={toastStyle}>{message}</div>;
}

function Spinner() {
  return <div aria-label="Loading" style={spinnerStyle} />;
}

function ScreenRenderer({ activeScreen }) {
  switch (activeScreen) {
    case 'today': return <HomeRitualScreen />;
    case 'timeline': return <TimelineScreen />;
    case 'compare': return <CompareScreen />;
    case 'family': return <FamilySharingScreen />;
    case 'settings': return <SettingsScreen />;
    default: return null;
  }
}

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

function AuthenticatedApp({ user, prefs, onSignOut, saving, toast }) {
  const { activeScreen, hasPrimaryScreen } = useAppShell();
  const name = user.user_metadata?.full_name || user.email || '';
  const avatar = user.user_metadata?.avatar_url;
  const copy = COPY[prefs.lang === 'pt' ? 'pt' : 'en'] ?? COPY.en;

  return (
    <div className="zommy-app-frame" style={appFrameStyle}>
      {toast && <Toast message={toast} />}
      <header style={appHeaderStyle}>
        <div aria-label="Zommy" style={wordmarkStyle}>Zommy</div>
        <div style={headerActionsStyle}>
          {avatar ? (
            <img src={avatar} alt="" referrerPolicy="no-referrer" style={avatarStyle} />
          ) : (
            <div style={avatarFallbackStyle}>{name.slice(0, 1).toUpperCase()}</div>
          )}
          <button className="b" disabled={saving} onClick={onSignOut} style={signOutButtonStyle}>
            {copy.signOut}
          </button>
        </div>
      </header>
      <main style={mainStyle}>
        {!hasPrimaryScreen && <div style={emptyShellStyle}>Choose a tab below or add a child to begin.</div>}
        <ScreenRenderer activeScreen={activeScreen} />
      </main>
      <ChapterScreen />
      <ChaptersLibrary />
      <AlwaysOnLayers />
    </div>
  );
}

export default function App() {
  const [prefs, setPrefs] = useState(getPrefs);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const { ensureDefaultPrimaryScreen } = useAppShell();
  const copy = COPY[prefs.lang === 'pt' ? 'pt' : 'en'] ?? COPY.en;
  const user = session?.user ?? null;

  useEffect(() => { injectGlobalStyles(); }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const handleOpenUrl = async ({ url }) => {
      if (!url?.startsWith('app.zommy://login-callback')) return;

      try {
        await Browser.close().catch(() => null);
        const parsed = new URL(url);
        const errorDescription = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
        if (errorDescription) throw new Error(errorDescription);

        const code = parsed.searchParams.get('code');
        if (!code) throw new Error('Missing auth code');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setSession(data.session ?? null);
        setSaving(false);
      } catch (error) {
        showToast(authMessage(error, copy));
        setSaving(false);
      }
    };

    let listener;
    CapacitorApp.addListener('appUrlOpen', handleOpenUrl).then((handle) => { listener = handle; });

    return () => {
      listener?.remove();
    };
  }, [copy]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
      setSaving(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) ensureDefaultPrimaryScreen();
  }, [ensureDefaultPrimaryScreen, user]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const updatePrefs = (next) => {
    setPrefs(next);
    const saved = savePrefs(next);
    dispatchPrefsChanged(saved);
  };

  const signIn = async () => {
    setSaving(true);

    const redirectTo = Capacitor.isNativePlatform()
      ? 'app.zommy://login-callback'
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Capacitor.isNativePlatform(),
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      showToast(authMessage(error, copy));
      setSaving(false);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      if (data?.url) await Browser.open({ url: data.url });
      else setSaving(false);
    }
  };

  const signOut = async () => {
    setSaving(true);
    await supabase.auth.signOut();
    setSession(null);
    setSaving(false);
  };

  if (loading) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div className="zommy-app-frame" style={loadingShellStyle}>
          <Spinner />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <InviteAcceptanceLayer />
        <div className="zommy-app-frame" style={signInShellStyle}>
          {toast && <Toast message={toast} />}
          <div style={signInCardStyle}>
            <BrandMark />
            <div>
              <h1 style={signInTitleStyle}>{copy.title}</h1>
              <p style={signInBodyStyle}>{copy.body}</p>
            </div>
            <button className="b" disabled={saving} onClick={signIn} style={signInButtonStyle}>
              {saving ? copy.signing : copy.cta}
            </button>
            <div style={languagePillsStyle}>
              {['en', 'pt'].map((lang) => (
                <button key={lang} className="b" onClick={() => updatePrefs({ ...prefs, lang })} style={languageButtonStyle(prefs.lang === lang)}>
                  {lang === 'en' ? 'English' : 'Português'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <InviteAcceptanceLayer />
      <AuthenticatedApp user={user} prefs={prefs} onSignOut={signOut} saving={saving} toast={toast} />
      <SpeedInsights />
      <Analytics />
    </>
  );
}

const appFrameStyle = {
  fontFamily: type.sans,
  background: palette.bg,
  color: palette.ink,
  minHeight: '100dvh',
  maxWidth: 480,
  margin: '0 auto',
  position: 'relative',
  overflow: 'hidden',
};

const appHeaderStyle = {
  position: 'fixed',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 120,
  width: '100%',
  maxWidth: 480,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 20px',
  background: 'rgba(245,242,238,0.92)',
  backdropFilter: 'blur(18px)',
  borderBottom: '1px solid rgba(28,25,23,0.08)',
};

const wordmarkStyle = {
  fontFamily: type.serif,
  fontSize: 19,
  fontWeight: type.weight.heading,
  color: palette.ink,
};

const headerActionsStyle = { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 };
const avatarStyle = { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(28,25,23,0.08)' };
const avatarFallbackStyle = { ...avatarStyle, background: palette.accentLight, color: palette.accent, display: 'grid', placeItems: 'center', fontWeight: type.weight.heading };
const signOutButtonStyle = { border: '1px solid rgba(28,25,23,0.12)', background: 'transparent', color: palette.inkSub, borderRadius: 9999, padding: '6px 10px', fontSize: 12, fontWeight: type.weight.ui, cursor: 'pointer' };
const mainStyle = { minHeight: '100dvh', paddingTop: 60, paddingBottom: 100 };
const emptyShellStyle = { minHeight: 'calc(100dvh - 160px)', display: 'grid', placeItems: 'center', padding: 24, color: palette.inkSub, textAlign: 'center', lineHeight: 1.55 };
const toastStyle = { position: 'fixed', top: 'calc(16px + env(safe-area-inset-top,0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 2400, width: 'min(400px, calc(100vw - 32px))', background: palette.surface, color: palette.ink, border: `1px solid ${palette.border}`, borderRadius: 14, padding: '14px 16px', fontSize: 13, fontWeight: type.weight.ui, textAlign: 'center', boxShadow: palette.shadowMd, animation: 'toast-enter .22s ease both' };
const loadingShellStyle = { fontFamily: type.sans, background: palette.bg, color: palette.ink, minHeight: '100dvh', maxWidth: 480, margin: '0 auto', display: 'grid', placeItems: 'center' };
const signInShellStyle = { fontFamily: type.sans, background: palette.bg, color: palette.ink, minHeight: '100dvh', maxWidth: 480, margin: '0 auto', display: 'grid', placeItems: 'center' };
const signInCardStyle = { width: '100%', maxWidth: 360, display: 'grid', gap: 22, textAlign: 'center', padding: '40px 24px', justifyItems: 'center' };
const signInTitleStyle = { fontFamily: type.serif, fontSize: 30, lineHeight: 1.15, fontWeight: type.weight.heading, marginTop: 6 };
const signInBodyStyle = { color: palette.inkSub, fontSize: 15, lineHeight: 1.65, marginTop: 10 };
const signInButtonStyle = { width: '100%', height: 50, border: 'none', background: palette.accent, color: '#fff', borderRadius: 14, fontSize: 15, fontWeight: type.weight.ui, cursor: 'pointer', boxShadow: '0 2px 12px rgba(201,106,58,0.30)' };
const languagePillsStyle = { display: 'flex', gap: 8, justifyContent: 'center' };
const languageButtonStyle = (active) => ({ border: `1px solid ${active ? palette.accentMid : palette.border}`, background: active ? palette.accentLight : 'transparent', color: active ? palette.accentText : palette.inkSub, borderRadius: 9999, padding: '8px 12px', fontSize: 13, fontWeight: type.weight.ui, cursor: 'pointer' });
const spinnerStyle = { width: 32, height: 32, borderRadius: '50%', border: `3px solid ${palette.accentLight}`, borderTopColor: palette.accent, animation: 'spin .8s linear infinite' };
const brandMarkStyle = (size) => ({ width: size, height: size, borderRadius: size === 80 ? 28 : Math.round(size * 0.32), background: palette.surface, boxShadow: '0 8px 32px rgba(201,106,58,0.15)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 });
