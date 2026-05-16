import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { palette, type } from "./designSystem";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Home",
    timeline: "Story",
    settings: "Settings",
    addMemory: "Save memory",
    addChildFirst: "Add child",
    addNamedMemory: (name) => `Save ${name}`,
    chooseChild: "Who is this memory for?",
    chooseTimeline: "Whose story do you want to open?",
    cancel: "Cancel",
  },
  pt: {
    today: "Início",
    timeline: "História",
    settings: "Definições",
    addMemory: "Guardar memória",
    addChildFirst: "Adicionar criança",
    addNamedMemory: (name) => `Guardar ${name}`,
    chooseChild: "Para quem é esta memória?",
    chooseTimeline: "Que história queres abrir?",
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
  const showLabels = memoryCount < 6;
  const activeTab = activeScreen || "today";
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || (profiles.length === 1 ? profiles[0] : null);

  useEffect(() => {
    if (!user) setActiveProfileId("");
  }, [setActiveProfileId, user]);

  useEffect(() => {
    if (activeProfileId && !profiles.some((profile) => profile.id === activeProfileId)) setActiveProfileId("");
  }, [activeProfileId, profiles, setActiveProfileId]);

  if (!user) return null;

  const beginMemoryFor = (profile) => {
    setChooserMode(null);
    if (profile?.id) setActiveProfileId(profile.id);
    openComposer(profile);
    refresh();
  };

  const handlePlus = () => {
    if (!profiles.length) {
      openProfileCreator();
      return;
    }

    if (activeProfile) {
      beginMemoryFor(activeProfile);
      return;
    }

    setChooserMode("memory");
  };

  const handleTab = (tab) => {
    if (tab === "timeline" && !activeProfile && profiles.length > 1) {
      setChooserMode("timeline");
      return;
    }

    if (tab === "today") {
      const profileId = activeProfileId || (profiles.length === 1 ? profiles[0].id : "");
      if (profileId) setActiveProfileId(profileId);
      openPrimaryScreen("today", { profileId });
      refresh();
      return;
    }

    if (tab === "timeline") {
      openPrimaryScreen("timeline", { profileId: activeProfile?.id || "" });
      refresh();
      return;
    }


    if (tab === "settings") {
      openPrimaryScreen("settings", { profileId: activeProfile?.id || activeProfileId || "" });
      refresh();
    }
  };

  const plusLabel = !profiles.length
    ? copy.addChildFirst
    : activeProfile
      ? copy.addNamedMemory(activeProfile.name)
      : copy.addMemory;

  const navItems = [
    { id: "today", icon: "⌂", label: copy.today, color: palette.clay },
    { id: "timeline", icon: "♡", label: copy.timeline, color: palette.sage },
    { id: "settings", icon: "☼", label: copy.settings, color: palette.lavender },
  ];

  const renderNavButton = (item) => {
    const isActive = activeTab === item.id;
    return (
      <button key={item.id} aria-label={item.label} onClick={() => handleTab(item.id)} className="b" style={{ minWidth: 0, height: showLabels ? 54 : 42, border: "none", borderRadius: 18, background: isActive ? "rgba(255,253,248,0.90)" : "transparent", color: isActive ? item.color : palette.inkMuted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: showLabels ? 3 : 0, fontFamily: type.sans, cursor: "pointer" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
        {showLabels && <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 800, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      {chooserMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(58,42,34,0.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }} onClick={() => setChooserMode(null)}>
          <div style={{ width: "100%", maxWidth: 452, background: "#FFFDF7", color: "#3A2A22", border: "1px solid rgba(122,77,57,0.16)", borderRadius: 26, padding: 18, boxShadow: "0 24px 90px rgba(122,77,57,0.22)" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ fontFamily: type.serif, fontSize: 22, fontWeight: 650, marginBottom: 14 }}>
              {chooserMode === "timeline" ? copy.chooseTimeline : copy.chooseChild}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((profile) => (
                <button key={profile.id} className="b" onClick={() => {
                  if (chooserMode === "timeline") {
                    setChooserMode(null);
                    setActiveProfileId(profile.id);
                    openPrimaryScreen("timeline", { profileId: profile.id });
                    refresh();
                  } else {
                    beginMemoryFor(profile);
                  }
                }} style={{ border: "1px solid rgba(122,77,57,0.14)", background: "#F8E9DC", color: "#3A2A22", borderRadius: 18, padding: "14px 15px", fontSize: 16, fontWeight: 800, textAlign: "left", display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: profile.color || "#D9826B", flexShrink: 0 }} />
                  <span>{profile.emoji || "👶"} {profile.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setChooserMode(null)} style={{ width: "100%", marginTop: 12, border: "none", background: "transparent", color: "#80695B", padding: 12, fontSize: 14, fontWeight: 750, cursor: "pointer" }}>
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 1100, background: "rgba(255,253,248,0.84)", backdropFilter: "blur(22px)", borderTop: `1px solid ${palette.border}`, boxShadow: "0 -18px 48px rgba(122,77,57,0.12)", padding: showLabels ? "9px 10px calc(13px + env(safe-area-inset-bottom, 0px))" : "10px 12px calc(14px + env(safe-area-inset-bottom, 0px))", display: "grid", gridTemplateColumns: "1fr 1fr minmax(82px, 1.18fr) 1fr", alignItems: "center", gap: 4 }}>
        {navItems.slice(0, 2).map(renderNavButton)}
        <button aria-label={plusLabel} onClick={handlePlus} className="b" style={{ minWidth: 0, minHeight: showLabels ? 58 : 44, borderRadius: showLabels ? 22 : 999, border: `2px solid ${palette.clay}`, background: "#FFFDF7", color: palette.clay, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, padding: showLabels ? "6px 8px" : 0, fontFamily: type.sans, cursor: "pointer", boxShadow: "0 14px 34px rgba(201,121,93,0.22)" }}>
          <span style={{ fontSize: showLabels ? 23 : 28, fontWeight: 800, lineHeight: 1, marginTop: showLabels ? -1 : -3 }}>+</span>
          {showLabels && <span style={{ fontSize: 10, lineHeight: 1.05, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plusLabel}</span>}
        </button>
        {navItems.slice(2).map(renderNavButton)}
      </nav>
    </>
  );
}