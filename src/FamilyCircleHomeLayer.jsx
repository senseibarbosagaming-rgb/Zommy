import { useEffect, useMemo, useState } from "react";
import { useAppShell } from "./AppShellContext";
import { palette, type } from "./designSystem";
import { listFamilyMembers, memberDisplayName } from "./familyCircle";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    sharedWith: (name) => `Shared with ${name}`,
    sharedCount: (count) => `Shared with ${count} family members`,
  },
  pt: {
    sharedWith: (name) => `Partilhado com ${name}`,
    sharedCount: (count) => `Partilhado com ${count} familiares`,
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const pillStyle = (color) => ({
  position: "fixed",
  left: "50%",
  top: "calc(118px + env(safe-area-inset-top, 0px))",
  transform: "translateX(-50%)",
  zIndex: 905,
  width: "min(448px, calc(100vw - 32px))",
  pointerEvents: "none",
  border: `1px solid ${palette.line}`,
  background: palette.overlaySoft,
  color,
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: type.weight.ui,
  lineHeight: "1.25",
  fontFamily: type.sans,
  boxShadow: palette.shadow,
  backdropFilter: "blur(16px)",
});

export default function FamilyCircleHomeLayer() {
  const { activeScreen } = useAppShell();
  const { user, profiles } = useZommyData({ includeEntries: false, includeLocal: false });
  const [members, setMembers] = useState([]);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);
  const profile = profiles[0];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user || !profile?.id) {
        if (!cancelled) setMembers([]);
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
  }, [user?.id, profile?.id]);

  if (!user || !profile || (activeScreen && activeScreen !== "today")) return null;

  const otherMembers = members.filter((member) => !member.is_current_user);
  if (otherMembers.length === 0) return null;

  const mainLine = otherMembers.length === 1
    ? copy.sharedWith(memberDisplayName(otherMembers[0]))
    : copy.sharedCount(otherMembers.length);

  return (
    <aside aria-live="polite" style={pillStyle(profile.color || palette.accent)}>
      <div>{mainLine}</div>
    </aside>
  );
}
