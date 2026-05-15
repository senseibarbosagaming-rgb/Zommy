import { useEffect } from "react";

export default function NotificationControlsLauncherLayer() {
  useEffect(() => {
    const openControls = () => {
      const button = Array.from(document.querySelectorAll("button"))
        .find((node) => /notifications|notificações/i.test(node.innerText || ""));
      button?.click?.();
    };

    window.addEventListener("zommy:open-notification-controls", openControls);
    return () => window.removeEventListener("zommy:open-notification-controls", openControls);
  }, []);

  return null;
}
