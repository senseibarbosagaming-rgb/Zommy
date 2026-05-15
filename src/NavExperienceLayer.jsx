import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const COPY = {
  en: {
    home: "Home",
    timeline: "Timeline",
    memory: "Memory",
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
    home: "Início",
    timeline: "Timeline",
    memory: "Memória",
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
  try {
    return JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
  } catch {
    return {};
  }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const getOriginalNavButtons = () => Array.from(document.querySelectorAll("#root > div:first-child nav button"));

const clickOriginalNav = (index) => {
  const button = getOriginalNavButtons()[index];
  if (button) button.click();
};

const getVisibleActiveProfileName = (profiles) => {
  const headerText = document.querySelector("#root > div:first-child header")?.innerText || "";
  return profiles.find((profile) => headerText.includes(profile.name))?.name || "";
};

const findClickableText = (text) => {
  const wanted = text.trim().toLowerCase();
  if (!wanted) return null;

  return Array.from(document.querySelectorAll("button, [role='button'], .b, div"))
    .find((node) => node.innerText?.trim().toLowerCase().includes(wanted));
};

const openProfileTimeline = async (profile) => {
  clickOriginalNav(0);
  await new Promise((resolve) => window.setTimeout(resolve, 80));

  const profileCard = findClickableText(profile.name);
  if (profileCard) {
    profileCard.click();
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
};

export default function NavExperienceLayer() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [activeName, setActiveName] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [chooserMode, setChooserMode] = useState(null);
  const [message, setMessage] = useState("");

  const copy = useMemo(getCopy, []);
  const showLabels = memoryCount < 4;
  const hasProfiles = profiles.length > 0;
  const activeProfile = profiles.find((profile) => profile.name === activeName);

  const refreshData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setProfiles([]);
      setMemoryCount(0);
      setActiveName("");
      return;
    }

    const [{ data: profileRows }, { count }] = await Promise.all([
      supabase.from("profiles").select("id,name,emoji,color,created_at").eq("user_id", currentUser.id).order("created_at"),
      supabase.from("entries").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id),
    ]);

    const nextProfiles = profileRows || [];
    setProfiles(nextProfiles);
    setMemoryCount(count || 0);
    setActiveName(getVisibleActiveProfileName(nextProfiles));
  }, []);

  useEffect(() => {
    refreshData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshData();
    });

    const onFocus = () => refreshData();
    window.addEventListener("focus", onFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshData]);

  useEffect(() => {
    if (!user) return undefined;

    const observer = new MutationObserver(() => {
      setActiveName(getVisibleActiveProfileName(profiles));
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [profiles, user]);

  if (!user) return null;

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2400);
  };

  const openAddChild = async () => {
    setActiveTab("home");
    clickOriginalNav(0);
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const addButton = Array.from(document.querySelectorAll("button"))
      .find((button) => /add a child|adicionar criança/i.test(button.innerText || ""));
    if (addButton) addButton.click();
    else showMessage(copy.addChildFirstHint);
  };

  const beginMemoryFor = async (profile) => {
    setChooserMode(null);
    await openProfileTimeline(profile);
    clickOriginalNav(2);
    setActiveTab("log");
    refreshData();
  };

  const handlePlus = async () => {
    if (!hasProfiles) {
      openAddChild();
      return;
    }

    if (activeProfile) {
      clickOriginalNav(2);
      setActiveTab("log");
      refreshData();
      return;
    }

    if (profiles.length === 1) {
      await beginMemoryFor(profiles[0]);
      return;
    }

    setChooserMode("memory");
  };

  const handleTab = async (tab) => {
    setActiveTab(tab);

    if (tab === "timeline" && profiles.length > 1 && !activeProfile) {
      setChooserMode("timeline");
      return;
    }

    if (tab === "timeline" && profiles.length === 1) {
      await openProfileTimeline(profiles[0]);
      refreshData();
      return;
    }

    const indexes = { home: 0, timeline: 1, compare: 3, settings: 4 };
    clickOriginalNav(indexes[tab]);
    refreshData();
  };

  const plusLabel = !hasProfiles
    ? copy.addChildFirst
    : activeProfile
      ? copy.addNamedMemory(activeProfile.name)
      : copy.addMemory;

  const navItems = [
    { id: "home", icon: "⌂", label: copy.home, color: "#60A5FA" },
    { id: "timeline", icon: "▦", label: copy.timeline, color: "#34D399" },
    { id: "compare", icon: "⇄", label: copy.compare, color: "#FBBF24" },
    { id: "settings", icon: "◎", label: copy.settings, color: "#A78BFA" },
  ];

  return (
    <>
      <style>{`
        #root > div:first-child > nav { display: none !important; }
      `}</style>

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
                <button key={profile.id} className="b" onClick={async () => {
                  if (chooserMode === "timeline") {
                    setChooserMode(null);
                    await openProfileTimeline(profile);
                    setActiveTab("timeline");
                    refreshData();
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
        {navItems.slice(0, 2).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} aria-label={item.label} onClick={() => handleTab(item.id)} className="b" style={{ minWidth: 0, height: showLabels ? 54 : 42, border: "none", borderRadius: 18, background: isActive ? "#3a5163" : "transparent", color: isActive ? item.color : "#d5dee6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: showLabels ? 3 : 0, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              {showLabels && <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 800, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          );
        })}

        <button aria-label={plusLabel} onClick={handlePlus} className="b" style={{ minWidth: 0, minHeight: showLabels ? 58 : 44, borderRadius: showLabels ? 20 : 999, border: "2px solid #17d86f", background: "rgba(23,216,111,0.08)", color: "#17d86f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, padding: showLabels ? "6px 8px" : 0, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer", boxShadow: "0 0 0 1px rgba(23,216,111,0.18), 0 8px 20px rgba(0,0,0,0.16)" }}>
          <span style={{ fontSize: showLabels ? 23 : 28, fontWeight: 600, lineHeight: 1, marginTop: showLabels ? -1 : -3 }}>+</span>
          {showLabels && <span style={{ fontSize: 10, lineHeight: 1.05, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plusLabel}</span>}
        </button>

        {navItems.slice(2).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} aria-label={item.label} onClick={() => handleTab(item.id)} className="b" style={{ minWidth: 0, height: showLabels ? 54 : 42, border: "none", borderRadius: 18, background: isActive ? "#3a5163" : "transparent", color: isActive ? item.color : "#d5dee6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: showLabels ? 3 : 0, fontFamily: "Inter, system-ui, sans-serif", cursor: "pointer" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              {showLabels && <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 800, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}
