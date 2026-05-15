import { useEffect, useMemo, useState } from "react";

const COPY = {
  en: {
    deleteTitle: "Delete this memory?",
    deleteBody: (name, date) => `This will permanently delete ${name ? `${name}'s ` : "this "}memory${date ? ` from ${date}` : ""}. This cannot be undone.`,
    cancel: "Cancel",
    delete: "Delete memory",
    fallbackPhoto: "Family memory photo",
    close: "Close",
  },
  pt: {
    deleteTitle: "Eliminar esta memória?",
    deleteBody: (name, date) => `Isto vai eliminar permanentemente ${name ? `a memória de ${name}` : "esta memória"}${date ? ` de ${date}` : ""}. Não é possível desfazer.`,
    cancel: "Cancelar",
    delete: "Eliminar memória",
    fallbackPhoto: "Foto de uma memória familiar",
    close: "Fechar",
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

const actionWords = new Set(["share", "edit", "delete", "partilhar", "editar", "eliminar", "cancel", "cancelar"]);
const dateLike = /\b\d{4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i;

const isDeleteButton = (button) => {
  const text = (button.innerText || button.textContent || "").trim().toLowerCase();
  return text === "delete" || text === "eliminar";
};

const findOverlay = (node) => {
  let current = node;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.position === "fixed" && Number(style.zIndex || 0) >= 90) return current;
    current = current.parentElement;
  }
  return null;
};

const getDeleteContext = (overlay) => {
  const lines = (overlay?.innerText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name = lines.find((line) => {
    const lower = line.toLowerCase();
    return !dateLike.test(line) && !actionWords.has(lower) && line.length <= 36 && !line.includes("×");
  }) || "";
  const date = lines.find((line) => dateLike.test(line)) || "";

  return { name, date };
};

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
      span.style.fontSize = index === 2 ? "10px" : "10px";
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
  const [pendingDelete, setPendingDelete] = useState(null);

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

  useEffect(() => {
    let bypassButton = null;

    const interceptDelete = (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !isDeleteButton(button)) return;
      if (button === bypassButton) {
        bypassButton = null;
        return;
      }

      const overlay = findOverlay(button);
      if (!overlay) return;
      const overlayText = overlay.innerText || "";
      if (!/(share|edit|partilhar|editar)/i.test(overlayText)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      setPendingDelete({ button, ...getDeleteContext(overlay) });
    };

    const confirmFromKeyboard = (event) => {
      if (event.key === "Escape") setPendingDelete(null);
    };

    document.addEventListener("click", interceptDelete, true);
    document.addEventListener("keydown", confirmFromKeyboard);

    window.__zommyConfirmDelete = (button) => {
      bypassButton = button;
      button?.click?.();
    };

    return () => {
      document.removeEventListener("click", interceptDelete, true);
      document.removeEventListener("keydown", confirmFromKeyboard);
      delete window.__zommyConfirmDelete;
    };
  }, []);

  const confirmDelete = () => {
    const button = pendingDelete?.button;
    setPendingDelete(null);
    window.setTimeout(() => window.__zommyConfirmDelete?.(button), 0);
  };

  if (!pendingDelete) return null;

  return (
    <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, fontFamily: "Inter, system-ui, sans-serif" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="zommy-delete-title" style={{ width: "100%", maxWidth: 420, background: "#111820", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: 20, boxShadow: "0 24px 90px rgba(0,0,0,0.55)" }}>
        <h2 id="zommy-delete-title" style={{ fontFamily: "Lora, Georgia, serif", fontSize: 25, lineHeight: 1.15, fontWeight: 650, marginBottom: 10 }}>{copy.deleteTitle}</h2>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>{copy.deleteBody(pendingDelete.name, pendingDelete.date)}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" onClick={() => setPendingDelete(null)} style={{ minHeight: 50, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 15, fontSize: 15, fontWeight: 850, cursor: "pointer" }}>
            {copy.cancel}
          </button>
          <button type="button" onClick={confirmDelete} style={{ minHeight: 50, border: "1px solid rgba(248,113,113,0.45)", background: "rgba(248,113,113,0.18)", color: "#fca5a5", borderRadius: 15, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
            {copy.delete}
          </button>
        </div>
      </section>
    </div>
  );
}
