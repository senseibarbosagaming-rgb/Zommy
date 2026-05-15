import { useEffect } from "react";

export default function SettingsLauncherLayer() {
  useEffect(() => {
    const onPointerDownCapture = (event) => {
      const nav = document.querySelector("nav[aria-label='Main navigation']");
      if (!nav) return;

      const buttons = Array.from(nav.querySelectorAll("button"));
      const settingsButton = buttons[4];
      if (!settingsButton || !settingsButton.contains(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("zommy:open-settings-hub"));
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  return null;
}
