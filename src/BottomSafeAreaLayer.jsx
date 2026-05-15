export default function BottomSafeAreaLayer() {
  return (
    <style>{`
      :root {
        --zommy-nav-clearance: calc(112px + env(safe-area-inset-bottom, 0px));
        --zommy-edge-padding: 16px;
      }

      body {
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      /* Full-screen app surfaces should never finish underneath the bottom nav. */
      main[style*="position: fixed"] > div[style*="min-height"],
      main[style*="position: fixed"] > div[style*="minHeight"],
      main[style*="position: fixed"] > div[style*="100dvh"] {
        padding-bottom: var(--zommy-nav-clearance) !important;
      }

      /* Bottom sheets and confirmation dialogs need extra bottom room because the nav is fixed above them. */
      div[style*="position: fixed"][style*="align-items: flex-end"],
      div[style*="position: fixed"][style*="alignItems: flex-end"],
      div[style*="position: fixed"][style*="align-items:flex-end"],
      div[style*="position: fixed"][style*="alignItems:flex-end"] {
        padding: var(--zommy-edge-padding) var(--zommy-edge-padding) var(--zommy-nav-clearance) var(--zommy-edge-padding) !important;
      }

      /* Dialog cards themselves should allow their last button to breathe. */
      [role="dialog"] {
        margin-bottom: env(safe-area-inset-bottom, 0px) !important;
        max-height: calc(100dvh - var(--zommy-nav-clearance) - 24px) !important;
        overflow-y: auto !important;
      }

      /* Any fixed overlay with explicit bottom padding still gets a minimum safe bottom. */
      div[style*="position: fixed"][style*="inset: 0"] > div[style*="max-height"],
      div[style*="position: fixed"][style*="inset:0"] > div[style*="max-height"],
      div[style*="position: fixed"][style*="inset: 0"] > section[role="dialog"],
      div[style*="position: fixed"][style*="inset:0"] > section[role="dialog"] {
        margin-bottom: var(--zommy-nav-clearance) !important;
      }

      /* Prevent bottom actions from being hidden when a sheet has sticky/final buttons. */
      main button:last-child,
      [role="dialog"] button:last-child,
      textarea + button:last-child,
      input + button:last-child {
        scroll-margin-bottom: var(--zommy-nav-clearance) !important;
      }
    `}</style>
  );
}
