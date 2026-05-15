import { useEffect, useMemo, useState } from "react";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    today: "Today",
    timeline: "Timeline",
    compare: "Compare",
    settings: "Settings",
    addMemory: "Add memory",
    addChildFirst: "Add child first",
    addChildFirstHint: "Create a child profile before saving memories.",
    addNamedMemory: (name) => `Add ${name} memory`,
    chooseChild: "Who is this memory for?",
    chooseTimeline: "Whose timeline do you want to open?",
    cancel: "Cancel",
  },
  pt: {
    today: "Hoje",
    timeline: "Timeline",
    compare: "Comparar",
    settings: "Definições",
    addMemory: "Adicionar memória",
    addChildFirst: "Adicionar criança",
    addChildFirstHint: "Cria primeiro um perfil antes de guardar memórias.",
    addNamedMemory: (name) => `Adicionar memória de ${name}`,
    chooseChild: "Para quem é esta memória?",
    chooseTimeline: "Que timeline queres abrir?",
    cancel: "Cancelar",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
const legacyButtons = () => Array.from(document.querySelectorAll("#root > div:first-child nav button"));
const clickLegacyNav = (index) => legacyButtons()[index]?.click?.();

const visibleProfileName = (profiles) => {
  const headerText = document.querySelector("#root > div:first-child header")?.innerText || "";
  return profiles.find((profile) => headerText.includes(profile.name))?.name || "";
};

const showToday = () => window.dispatchEvent(new CustomEvent("zommy:show-today"));
const hideToday = () => window.dispatchEvent(new CustomEvent("zommy:hide-today"));
const showTimeline = (profile) => window.dispatchEvent(new CustomEvent("zommy:show-timeline", { detail: { profileId: profile?.id || "" } }));
const hideTimeline = () => window.dispatchEvent(new CustomEvent("zommy:hide-timeline"));
const showSettings = () => window.dispatchEvent(new CustomEvent("zommy:show-settings"));
const hideSettings = () => window.dispatchEvent(new CustomEvent("zommy:hide-settings"));
const openCompare = () => window.dispatchEvent(new CustomEvent("zommy:open-compare-modes"));
const openComposer = (profile) => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: profile?.id || "" } }));

export default function NavExperienceLayer() {
  const { user, profiles, memoryCount, refresh } = useZommyData({ includeEntries: false, includeLocal: false });
  const [activeName, setActiveName] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [chooserMode, setChooserMode] = useState(null);
  const [message, setMessage] = useState("");

  const copy = useMemo(getCopy, []);
  const showLabels = memoryCount < 4;
  const activeProfile = profiles.find((profile) => profile.name === activeName) || (profiles.length === 1 ? profiles[0] : null);

  useEffect(() => {
    if (!user) return undefined;
    const observer = new MutationObserver(() => setActiveName(visibleProfileName(profiles)));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setActiveName(visibleProfileName(profiles));
    return () => observer.disconnect();
  }, [profiles, user]);

  if (!user) return null;

  const flash = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const openAddChild = async () => {
    setActiveTab("today");
    hideToday();
    hideTimeline();
    hideSettings();
    clickLegacyNav(0);
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const addButton = Array.from(document.querySelectorAll("button"))
      .find((button) => /add a child|adicionar criança/i.test(button.innerText || ""));
    if (addButton) addButton.click();
    else flash(copy.addChildFirstHint);
  };

  const beginMemoryFor = (profile) => {
    setChooserMode(null);
    setActiveTab("today");
    openComposer(profile);
    refresh();
  };

  const handlePlus = async () => {
    if (!profiles.length) {
      await openAddChild();
      return;
    }

    if (activeProfile) {
      beginMemoryFor(activeProfile);
      return;
    }

    setChooserMode("memory");
  };

  const handleTab = async (tab) => {
    setActiveTab(tab);

    if (tab === "today") {
      hideTimeline();
      hideSettings();
      clickLegacyNav(0);
      showToday();
      refresh();
      return;
    }

    hideToday();

    if (tab === "timeline") {
      hideSettings();
      showTimeline(activeProfile);
      refresh();
      return;
    }

    hideTimeline();

    if (tab === "compare") {
      hideSettings();
      openCompare();
      refresh();
      return;
    }

    if (tab === "settings") {
      showSettings();
      refresh();
      return;
    }
  };

  const plusLabel = !profiles.length
    ? copy.addChildFirst
    : activeProfile
      ? copy.addNamedMemory(activeProfile.name)
      : copy.addMemory;

  const navItems = [
    { id: "today", icon: "⌂", label: copy.today, color: "#60A5FA" },
    { id: "timeline", icon: "▦", label: copy.timeline, color: "#34D399" },
    { id: "compare", icon: "⇄", label: copy.compare, color: "#FBBF24" },
    { id: "settings", icon: "◎", label: copy.settings, color: "#A78BFA" },
  ];

  const renderNavButton = (item) => {
    const isActive = activeTab === item.id;
    return (
      <button key={item.id} aria-label={item.label} onClick={() => handleTab(item.id)} className="b" style={{ minWidth: 0, height: showLabels ? 54 : 42, border: "none", borderRadius: 18, background: isActive ? "#3a5163" : "transparent", color: isActive ? item.color : "#d5dee6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: showLabels ? 3 : 0, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
        {showLabels && <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 800, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      <style>{`#root > div:first-child > nav { display: none !important; }`}</style>

      {message && (
        <div style={{ position: "fixed", bottom: showLabels ? 104 : 86, left: "50%", transform: "translateX(-50%)", zIndex: 1199, background: "#fff", color: "#111", borderRadius: 18, padding: "10px 16px", fontSize: 13, fontWeight: 650, boxShadow: "0 10px 35px rgba(0,0,0,0.26)", maxWidth: "min(88vw, 390px)", textAlign: "center" }}>
          {message}
        </div>
      )}

      {chooserMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.58)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }} onClick={() => setChooserMode(null)}>
          <div style={{ width: "100%", maxWidth: 452, background: "#111820", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 18, boxShadow: "0 24px 90px rgba(0,0,0,0.45)" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 22, fontWeight: 650, marginBottom: 14 }}>
              {chooserMode === "timeline" ? copy.chooseTimeline : copy.chooseChild}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((profile) => (
                <button key={profile.id} className="b" onClick={() => {
                  if (chooserMode === "timeline") {
                    setChooserMode(null);
                    setActiveTab("timeline");
                    hideToday();
                    hideSettings();
                    showTimeline(profile);
                    refresh();
                  } else {
                    beginMemoryFor(profile);
                  }
                }} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 16, padding: "14px 15px", fontSize: 16, fontWeight: 700, textAlign: "left", display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: profile.color || "#34D399", flexShrink: 0 }} />
                  <span>{profile.emoji || "👶"} {profile.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setChooserMode(null)} style={{ width: "100%", marginTop: 12, border: "none", background: "transparent", color: "rgba(255,255,255,0.58)", padding: 12, fontSize: 14, fontWeight: 650, cursor: "pointer" }}>
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 1100, background: "#43596a", boxShadow: "0 -1px 0 rgba(255,255,255,0.04), 0 -10px 30px rgba(0,0,0,0.12)", padding: showLabels ? "9px 10px calc(13px + env(safe-area-inset-bottom, 0px))" : "10px 12px calc(14px + env(safe-area-inset-bottom, 0px))", display: "grid", gridTemplateColumns: "1fr 1fr minmax(78px, 1.26fr) 1fr 1fr", alignItems: "center", gap: 4 }}>
        {navItems.slice(0, 2).map(renderNavButton)}
        <button aria-label={plusLabel} onClick={handlePlus} className="b" style={{ minWidth: 0, minHeight: showLabels ? 58 : 44, borderRadius: showLabels ? 20 : 999, border: "2px solid #17d86f", background: "rgba(23,216,111,0.08)", color: "#17d86f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, padding: showLabels ? "6px 8px" : 0, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer", boxShadow: "0 0 0 1px rgba(23,216,111,0.18), 0 8px 20px rgba(0,0,0,0.16)" }}>
          <span style={{ fontSize: showLabels ? 23 : 28, fontWeight: 600, lineHeight: 1, marginTop: showLabels ? -1 : -3 }}>+</span>
          {showLabels && <span style={{ fontSize: 10, lineHeight: 1.05, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plusLabel}</span>}
        </button>
        {navItems.slice(2).map(renderNavButton)}
      </nav>
    </>
  );
}
