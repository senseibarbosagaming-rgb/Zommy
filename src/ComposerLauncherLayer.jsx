import { useEffect } from "react";
import { supabase } from "./supabase";

const getOriginalHomeButton = () => document.querySelectorAll("#root > div:first-child nav button")?.[0];

const getVisibleActiveProfile = (profiles) => {
  const headerText = document.querySelector("#root > div:first-child header")?.innerText || "";
  return profiles.find((profile) => headerText.includes(profile.name)) || null;
};

const openAddChild = async () => {
  getOriginalHomeButton()?.click();
  await new Promise((resolve) => window.setTimeout(resolve, 80));

  const addButton = Array.from(document.querySelectorAll("button"))
    .find((button) => /add a child|adicionar criança/i.test(button.innerText || ""));

  addButton?.click();
};

export default function ComposerLauncherLayer() {
  useEffect(() => {
    const onPointerDownCapture = async (event) => {
      const nav = document.querySelector("nav[aria-label='Main navigation']");
      if (!nav) return;

      const buttons = Array.from(nav.querySelectorAll("button"));
      const plusButton = buttons[2];
      if (!plusButton || !plusButton.contains(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id,name,emoji,color,created_at")
        .eq("user_id", user.id)
        .order("created_at");

      const profiles = data || [];
      if (profiles.length === 0) {
        openAddChild();
        return;
      }

      const activeProfile = getVisibleActiveProfile(profiles);
      const selectedProfile = activeProfile || (profiles.length === 1 ? profiles[0] : null);

      window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", {
        detail: { profileId: selectedProfile?.id || "" },
      }));
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  return null;
}
