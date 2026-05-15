import { useEffect } from "react";
import { supabase } from "./supabase";

const dispatchResume = async () => {
  if (document.visibilityState === "hidden") return;

  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (!data?.session?.user) return;

  window.dispatchEvent(new CustomEvent("zommy:app-resume"));

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("zommy:show-today"));
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
  }, 80);
};

export default function ResumeRecoveryLayer() {
  useEffect(() => {
    const onResume = () => dispatchResume();
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") dispatchResume();
    };

    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    window.addEventListener("online", onResume);
    document.addEventListener("visibilitychange", onVisibility);

    const initial = window.setTimeout(dispatchResume, 300);

    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
      window.removeEventListener("online", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
