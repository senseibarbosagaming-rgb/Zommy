import { useEffect } from "react";

export default function AccessibilitySafetyLayer() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      button, [role="button"], input, textarea, select {
        touch-action: manipulation;
      }

      button, [role="button"], .b {
        min-height: 44px;
      }

      button:focus-visible,
      [role="button"]:focus-visible,
      a:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {
        outline: 3px solid #fbbf24 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 5px rgba(251,191,36,0.22) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.001ms !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return null;
}
