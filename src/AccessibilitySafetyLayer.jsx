import { useEffect, useMemo } from "react";

const COPY = {
  en: {
    fallbackPhoto: "Family memory photo",
  },
  pt: {
    fallbackPhoto: "Foto de uma memória familiar",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const hasVisibleText = (button) => {
  const text = (button.innerText || button.textContent || "").trim();
  if (!text) return false;
  return text.length > 2 && !["⌂", "▦", "+", "⇄", "◎", "×"].includes(text);
};

const addNavLabels = () => {
  const nav = document.querySelector('nav[aria-label="Main navigation"]');
  if (!nav) return;

  const buttons = Array.from(nav.querySelectorAll("button"));
  buttons.forEach((button, index) => {
    const label = button.getAttribute("aria-label") || button.title || "";
    if (!label) return;

    button.style.minHeight = index === 2 ? "56px" : "54px";
    button.style.minWidth = index === 2 ? "86px" : "54px";
    button.style.padding = index === 2 ? "7px 8px" : "5px 6px";
    button.style.gap = "3px";

    if (!hasVisibleText(button) && !button.querySelector("[data-zommy-nav-label]")) {
      const span = document.createElement("span");
      span.dataset.zommyNavLabel = "true";
      span.textContent = label;
      span.style.fontSize = "10px";
      span.style.lineHeight = "1.05";
      span.style.fontWeight = index === 2 ? "900" : "800";
      span.style.maxWidth = "100%";
      span.style.overflow = "hidden";
      span.style.textOverflow = "ellipsis";
      span.style.whiteSpace = "nowrap";
      span.style.display = "block";
      span.style.color = "currentColor";
      button.appendChild(span);
    }

    const icon = button.querySelector("span:first-child");
    if (icon && index === 2) {
      icon.style.fontSize = "28px";
      icon.style.marginTop = "-2px";
    }
  });
};

const improveAltText = (copy) => {
  document.querySelectorAll("img").forEach((img) => {
    if (img.getAttribute("alt")) return;
    const nearbyText = img.closest("article, button, div")?.innerText?.trim()?.split("\n")?.filter(Boolean)?.[0];
    img.setAttribute("alt", nearbyText && nearbyText.length <= 60 ? `${nearbyText} memory photo` : copy.fallbackPhoto);
  });
};

const improveInlineContrast = () => {
  document.querySelectorAll("[style]").forEach((element) => {
    const color = element.style.color;
    if (!color) return;
    const normalized = color.replace(/\s+/g, "").toLowerCase();
    if (["#555", "#555555", "rgb(85,85,85)"].includes(normalized)) element.style.color = "#9a9a9a";
    if (["#666", "#666666", "rgb(102,102,102)"].includes(normalized)) element.style.color = "#a8a8a8";
    if (["#777", "#777777", "rgb(119,119,119)"].includes(normalized)) element.style.color = "#b0b0b0";
  });
};

const improveButtonLabels = () => {
  document.querySelectorAll("button").forEach((button) => {
    if (button.getAttribute("aria-label")) return;
    const text = (button.innerText || button.textContent || "").trim();
    if (text) button.setAttribute("aria-label", text.replace(/\s+/g, " "));
  });
};

export default function AccessibilitySafetyLayer() {
  const copy = useMemo(getCopy, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      button, [role="button"], input, textarea, select { touch-action: manipulation; }
      button, [role="button"], .b { min-height: 44px; }
      button:focus-visible, [role="button"]:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: 3px solid #fbbf24 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 5px rgba(251,191,36,0.22) !important;
      }
      nav[aria-label="Main navigation"] button { min-height: 54px !important; }
      nav[aria-label="Main navigation"] button:nth-child(3) {
        min-width: 86px !important;
        min-height: 56px !important;
        border-radius: 20px !important;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
      }
    `;
    document.head.appendChild(style);

    const enhance = () => {
      addNavLabels();
      improveAltText(copy);
      improveInlineContrast();
      improveButtonLabels();
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "alt", "aria-label"] });
    const interval = window.setInterval(enhance, 1500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      style.remove();
    };
  }, [copy]);

  return null;
}
