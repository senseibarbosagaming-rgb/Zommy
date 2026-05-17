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

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const openProfileCreator = () => window.dispatchEvent(new CustomEvent("zommy:open-profile-creator"));
const openComposer = (profile) => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile?.id || "" } }));

export default function NavExperienceLayer() {
  const { user, profiles, memoryCount, refresh } = useZommyData({ includeEntries: false, includeLocal: false });
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
    { id: "today", icon: "⌂", label: copy.today, color: palette.clay },
    { id: "timeline", icon: "◌", label: copy.timeline, color: palette.sage },
    { id: "compare", icon: "↔", label: copy.compare, color: palette.deep },
    { id: "family", icon: "♡", label: copy.family, color: palette.roseBeige },
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
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(46,41,35,0.38)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }} onClick={() => setChooserMode(null)}>
          <div style={{ width: "100%", maxWidth: 452, background: palette.paper, color: palette.ink, border: `1px solid ${palette.border}`, borderRadius: 28, padding: 18, boxShadow: palette.shadow }} onClick={(event) => event.stopPropagation()}>
            <div style={{ fontFamily: type.serif, fontSize: 23, fontWeight: 650, marginBottom: 14 }}>{chooserMode === "memory" ? copy.chooseChild : copy.chooseTimeline}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((profile) => (
                <button key={profile.id} className="b" onClick={() => chooseProfile(profile)} style={{ border: `1px solid ${palette.border}`, background: "rgba(255,247,240,.72)", color: palette.ink, borderRadius: 20, minHeight: 58, padding: "10px 12px", display: "flex", alignItems: "center", gap: 11, fontWeight: 850, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 14, background: `${profile.color || palette.clay}20`, display: "grid", placeItems: "center", fontSize: 20 }}>{profile.emoji || "◌"}</span>
                  <span>{profile.name}</span>
                </button>
              ))}
              <button onClick={() => setChooserMode(null)} style={{ border: "none", background: "transparent", color: palette.inkMuted, padding: 10, fontWeight: 850 }}>{copy.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <nav aria-label="Primary" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(12px + env(safe-area-inset-bottom, 0px))", zIndex: 1000, width: "min(452px, calc(100vw - 24px))", display: "grid", gridTemplateColumns: "1fr 1fr 66px 1fr 1fr", alignItems: "center", gap: 7, padding: 8, border: `1px solid ${palette.border}`, borderRadius: 28, background: "rgba(255,253,248,0.90)", boxShadow: "0 18px 46px rgba(91,67,48,0.16)", backdropFilter: "blur(20px)" }}>
        {navItems.slice(0, 2).map((item) => <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => handleTab(item.id)} />)}
        <button aria-label={plusLabel} title={plusLabel} onClick={handlePlus} className="b" style={{ width: 58, height: 58, border: "none", borderRadius: 22, background: palette.clay, color: "#FFFDF8", fontSize: 28, lineHeight: 1, boxShadow: `0 15px 32px ${palette.clay}38`, cursor: "pointer" }}>+</button>
        {navItems.slice(2).map((item) => <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => handleTab(item.id)} />)}
      </nav>
    </>
  );
}

function NavButton({ item, active, onClick }) {
  return (
    <button aria-label={item.label} onClick={onClick} className="b" style={{ minWidth: 0, height: 54, border: "none", borderRadius: 20, background: active ? `${item.color}16` : "transparent", color: active ? item.color : palette.inkMuted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontFamily: type.sans, cursor: "pointer" }}>
      <span style={{ fontSize: 21, lineHeight: 1 }}>{item.icon}</span>
      <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 850, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
    </button>
  );
}
