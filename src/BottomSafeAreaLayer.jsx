import { useEffect } from "react";

const STYLE_ID = "zommy-safe-area-css";
const CSS = `
  :root {
    --zommy-nav-clearance: calc(112px + env(safe-area-inset-bottom, 0px));
    --zommy-edge-padding: 20px;
  }

  body {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  main[style*="position: fixed"] > div[style*="min-height"],
  main[style*="position: fixed"] > div[style*="minHeight"],
  main[style*="position: fixed"] > div[style*="100dvh"] {
    padding-bottom: var(--zommy-nav-clearance) !important;
  }

  div[style*="position: fixed"][style*="align-items: flex-end"],
  div[style*="position: fixed"][style*="alignItems: flex-end"],
  div[style*="position: fixed"][style*="align-items:flex-end"],
  div[style*="position: fixed"][style*="alignItems:flex-end"] {
    padding: var(--zommy-edge-padding) var(--zommy-edge-padding) var(--zommy-nav-clearance) var(--zommy-edge-padding) !important;
  }

  [role="dialog"] {
    margin-bottom: env(safe-area-inset-bottom, 0px) !important;
    max-height: calc(100dvh - var(--zommy-nav-clearance) - 24px) !important;
    overflow-y: auto !important;
  }

  div[style*="position: fixed"][style*="inset: 0"] > div[style*="max-height"],
  div[style*="position: fixed"][style*="inset:0"] > div[style*="max-height"],
  div[style*="position: fixed"][style*="inset: 0"] > section[role="dialog"],
  div[style*="position: fixed"][style*="inset:0"] > section[role="dialog"] {
    margin-bottom: var(--zommy-nav-clearance) !important;
  }

  main button:last-child,
  [role="dialog"] button:last-child,
  textarea + button:last-child,
  input + button:last-child {
    scroll-margin-bottom: var(--zommy-nav-clearance) !important;
  }
`;

export default function BottomSafeAreaLayer() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);

  return null;
}
