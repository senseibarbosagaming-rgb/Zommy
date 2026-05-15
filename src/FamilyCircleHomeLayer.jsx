import { useEffect, useMemo, useState } from "react";
import { listFamilyMembers, memberDisplayName } from "./familyCircle";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    privateLine: "Only you can see this for now",
    sharedWith: (name) => `Shared with ${name}`,
    sharedCount: (count) => `Shared with ${count} family members`,
    invite: "Invite your partner when you’re ready",
  },
  pt: {
    privateLine: "Por agora, só tu consegues ver isto",
    sharedWith: (name) => `Partilhado com ${name}`,
    sharedCount: (count) => `Partilhado com ${count} familiares`,
    invite: "Convida o teu parceiro quando fizer sentido",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const pillStyle = (color) => ({
  border: `1px solid ${color}55`,
  background: `${color}14`,
  color: "rgba(255,255,255,0.76)",
  borderRadius: "999px",
  padding: "8px 11px",
  marginTop: "8px",
  fontSize: "12px",
  fontWeight: "850",
  lineHeight: "1.25",
  width: "fit-content",
  maxWidth: "100%",
});

const detailStyle = () => ({
  color: "rgba(255,255,255,0.46)",
  fontSize: "11px",
  marginTop: "3px",
  lineHeight: "1.35",
});

const findHomeTitle = (profileName) => Array.from(document.querySelectorAll("h1"))
  .find((node) => (node.textContent || "").trim() === profileName);

const removePresence = () => {
  document.getElementById("zommy-family-circle-home-presence")?.remove();
};

const addPresence = ({ profile, members, copy }) => {
  if (!profile?.name) return;
  const title = findHomeTitle(profile.name);
  if (!title || document.getElementById("zommy-family-circle-home-presence")) return;

  const otherMembers = members.filter((member) => !member.is_current_user);
  const wrapper = document.createElement("div");
  wrapper.id = "zommy-family-circle-home-presence";
  Object.assign(wrapper.style, pillStyle(profile.color || "#34D399"));

  const mainLine = document.createElement("div");
  mainLine.textContent = otherMembers.length === 0
    ? copy.privateLine
    : otherMembers.length === 1
      ? copy.sharedWith(memberDisplayName(otherMembers[0]))
      : copy.sharedCount(otherMembers.length);

  wrapper.appendChild(mainLine);

  if (otherMembers.length === 0) {
    const detail = document.createElement("div");
    Object.assign(detail.style, detailStyle());
    detail.textContent = copy.invite;
    wrapper.appendChild(detail);
  }

  title.parentElement?.appendChild(wrapper);
};

export default function FamilyCircleHomeLayer() {
  const { user, profiles } = useZommyData({ includeEntries: false, includeLocal: false });
  const [members, setMembers] = useState([]);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);
  const profile = profiles[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || !profile?.id) {
        setMembers([]);
        return;
      }
      const rows = await listFamilyMembers(profile.id);
      if (!cancelled) setMembers(rows);
    };
    load();
    window.addEventListener("zommy:sharing-changed", load);
    window.addEventListener("zommy:profiles-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("zommy:sharing-changed", load);
      window.removeEventListener("zommy:profiles-changed", load);
    };
  }, [user, profile?.id]);

  useEffect(() => {
    removePresence();
    if (!user || !profile) return undefined;
    const inject = () => addPresence({ profile, members, copy });
    inject();
    const observer = new MutationObserver(() => {
      removePresence();
      inject();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      removePresence();
    };
  }, [user, profile, members, copy]);

  return null;
}
