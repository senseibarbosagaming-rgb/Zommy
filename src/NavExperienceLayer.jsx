import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { palette, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Today",
    timeline: "Memories",
    compare: "Compare",
    family: "Family",
    addMemory: "Add memory",
    addChildFirst: "Add child",
    addNamedMemory: (name) => `Add ${name}`,
    chooseChild: "Whose story is this for?",
    chooseTimeline: "Whose memories do you want to open?",
    cancel: "Cancel",
  },
  pt: {
    today: "Hoje",
    timeline: "Memórias",
    compare: "Comparar",
    family: "Família",
    addMemory: "Adicionar memória",
    addChildFirst: "Adicionar criança",
    addNamedMemory: (name) => `Adicionar ${name}`,
    chooseChild: "Para que história é esta memória?",
    chooseTimeline: "Que memórias queres abrir?",
    cancel: "Cancelar",
  },
};

const NAV_ICONS = {
  today: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  timeline: (
    <>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
      <path d="M8 7v10" />
      <path d="M16 7v10" />
    </>
  ),
  compare: (
    <>
      <path d="M7 7h11l-3-3" />
      <path d="M18 7l-3 3" />
      <path d="M17 17H6l3 3" />
      <path d="M6 17l3-3" />
    </>
  ),
  family: (
    <path d="M20.5 8.7c0 5.1-8.5 10-8.5 10S3.5 13.8 3.5 8.7A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.5 2.7Z" />
  ),
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const openProfileCreator = () => window.dispatchEvent(new CustomEvent("zommy:open-profile-creator"));
const openComposer = (profile) => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile?.id || "" } }));

export default function NavExperienceLayer() {
  const { user, profiles, refresh } = useZommyData({ includeEntries: false, includeLocal: false });
  const { activeProfileId, activeScreen, openPrimaryScreen, setActiveProfileId } = useAppShell();
  const [chooserMode, setChooserMode] = useState(null);

  const copy = useMemo(getCopy, []);
  const activeTab = activeScreen || "today";
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || (profiles.length === 1 ? profiles[0] : null);

  useEffect(() => { if (!user) setActiveProfileId(""); }, [setActiveProfileId, user]);
  useEffect(() => { if (activeProfileId && !profiles.some((profile) => profile.id === activeProfileId)) setActiveProfileId(""); }, [activeProfileId, profiles, setActiveProfileId]);
  if (!user) return null;

  const beginMemoryFor = (profile) => {
    setChooserMode(null);
    if (profile?.id) setActiveProfileId(profile.id);
    openComposer(profile);
    refresh();
  };

  const handlePlus = () => {
    if (!profiles.length) return openProfileCreator();
    if (activeProfile) return beginMemoryFor(activeProfile);
    setChooserMode("memory");
  };

  const openForTab = (tab) => {
    const profileId = activeProfileId || (profiles.length === 1 ? profiles[0].id : "");
    if (profileId) setActiveProfileId(profileId);
    openPrimaryScreen(tab, { profileId });
    refresh();
  };

  const handleTab = (tab) => {
    if ((tab === "timeline" || tab === "compare") && !activeProfile && profiles.length > 1) {
      setChooserMode(tab);
      return;
    }
    openForTab(tab);
  };

  const plusLabel = !profiles.length ? copy.addChildFirst : activeProfile ? copy.addNamedMemory(activeProfile.name) : copy.addMemory;
  const navItems = [
    { id: "today", label: copy.today },
    { id: "timeline", label: copy.timeline },
    { id: "compare", label: copy.compare },
    { id: "family", label: copy.family },
  ];

  const chooseProfile = (profile) => {
    setChooserMode(null);
    setActiveProfileId(profile.id);
    if (chooserMode === "memory") beginMemoryFor(profile);
    else openPrimaryScreen(chooserMode || "timeline", { profileId: profile.id });
    refresh();
  };

  return (
    <>
      {chooserMode && (
        <div style={chooserScrimStyle} onClick={() => setChooserMode(null)}>
          <div style={chooserCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={chooserTitleStyle}>{chooserMode === "memory" ? copy.chooseChild : copy.chooseTimeline}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((profile) => (
                <button key={profile.id} className="b" onClick={() => chooseProfile(profile)} style={profileButtonStyle}>
                  <span style={{ ...profileAvatarStyle, background: profile.bg || palette.accentSoft, color: profile.color || palette.accent }}>{profile.emoji || "○"}</span>
                  <span>{profile.name}</span>
                </button>
              ))}
              <button onClick={() => setChooserMode(null)} style={cancelStyle}>{copy.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <nav aria-label="Primary" style={navStyle}>
        {navItems.slice(0, 2).map((item) => <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => handleTab(item.id)} />)}
        <button aria-label={plusLabel} title={plusLabel} onClick={handlePlus} className="b" style={plusButtonStyle}>+</button>
        {navItems.slice(2).map((item) => <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => handleTab(item.id)} />)}
      </nav>
    </>
  );
}

function NavButton({ item, active, onClick }) {
  return (
    <button aria-label={item.label} onClick={onClick} className="b" style={navButtonStyle}>
      <span style={{ ...navIconPillStyle, background: active ? palette.accentSoft : "transparent" }}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {NAV_ICONS[item.id]}
        </svg>
      </span>
      <span style={navLabelStyle}>{item.label}</span>
    </button>
  );
}

const chooserScrimStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: palette.overlay,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 20,
};

const chooserCardStyle = {
  width: "100%",
  maxWidth: 452,
  background: palette.surface,
  color: palette.stone,
  border: "none",
  borderRadius: 20,
  padding: 20,
  boxShadow: palette.sideShadow,
};

const chooserTitleStyle = {
  fontFamily: type.serif,
  fontSize: 24,
  lineHeight: 1.15,
  fontWeight: type.weight.heading,
  marginBottom: 16,
};

const profileButtonStyle = {
  border: `1px solid ${palette.line}`,
  background: palette.surface,
  color: palette.stone,
  borderRadius: 18,
  minHeight: 58,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: 11,
  fontWeight: type.weight.ui,
  cursor: "pointer",
  textAlign: "left",
};

const profileAvatarStyle = {
  width: 38,
  height: 38,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontSize: 20,
};

const cancelStyle = {
  border: "none",
  background: "transparent",
  color: palette.muted,
  minHeight: 48,
  padding: 10,
  fontWeight: type.weight.ui,
};

const navStyle = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  zIndex: 1000,
  width: "min(452px, calc(100vw - 40px))",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 56px 1fr 1fr",
  alignItems: "center",
  gap: 6,
  padding: 8,
  border: "none",
  borderRadius: 999,
  background: palette.overlaySoft,
  boxShadow: palette.sideShadow,
  backdropFilter: "blur(20px)",
};

const plusButtonStyle = {
  width: 56,
  height: 56,
  minHeight: 56,
  border: "none",
  borderRadius: 999,
  background: palette.accent,
  color: palette.surface,
  fontSize: 27,
  lineHeight: 1,
  fontWeight: type.weight.heading,
  boxShadow: palette.shadow,
  cursor: "pointer",
};

const navButtonStyle = {
  minWidth: 0,
  height: 56,
  minHeight: 56,
  border: "none",
  borderRadius: 999,
  background: "transparent",
  color: palette.stone,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  fontFamily: type.sans,
  cursor: "pointer",
};

const navIconPillStyle = {
  width: 32,
  height: 24,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  color: palette.stone,
};

const navLabelStyle = {
  fontSize: 10,
  lineHeight: 1,
  fontWeight: type.weight.ui,
  color: palette.muted,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
