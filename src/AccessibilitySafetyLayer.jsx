import { useEffect } from 'react';

const STYLE_ID = 'zommy-accessibility-css';
const CSS = `
  button, [role="button"], input, textarea, select {
    touch-action: manipulation;
  }

  button, [role="button"], .b {
    min-height: 48px;
  }

  button:focus-visible,
  [role="button"]:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 3px solid #C96A3A !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 5px rgba(201,106,58,0.18) !important;
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

export default function AccessibilitySafetyLayer() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);

  return null;
}
