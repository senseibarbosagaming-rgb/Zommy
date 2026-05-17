import { useEffect, useMemo, useState } from "react";
import { palette, type } from "./designSystem";
import { getQueuedCount } from "./pwaStorage";
import { flushQueuedUploads } from "./pwaUploadQueue";

const COPY = {
  en: {
    installTitle: "Install Zommy",
    installBody: "Open it from your phone home screen, right where a parent needs it.",
    install: "Install",
    later: "Later",
    offline: "Offline. New memories will be queued.",
    queued: (count) => `${count} queued ${count === 1 ? "memory" : "memories"}`,
    syncing: "Uploading queued memories…",
    synced: "Queued memories uploaded.",
  },
  pt: {
    installTitle: "Instalar Zommy",
    installBody: "Abre a app a partir do ecrã inicial do telemóvel, onde faz sentido para um pai ou mãe.",
    install: "Instalar",
    later: "Depois",
    offline: "Sem ligação. As novas memórias ficam em fila.",
    queued: (count) => `${count} ${count === 1 ? "memória" : "memórias"} em fila`,
    syncing: "A carregar memórias em fila…",
    synced: "Memórias em fila carregadas.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;

export default function PWAExperienceLayer() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [message, setMessage] = useState("");
  const copy = useMemo(getCopy, []);

  const refreshQueue = async () => {
    try { setQueuedCount(await getQueuedCount()); }
    catch { setQueuedCount(0); }
  };

  const runFlush = async () => {
    if (!navigator.onLine) return;
    const count = await getQueuedCount().catch(() => 0);
    if (!count) return;

    setMessage(copy.syncing);
    const result = await flushQueuedUploads({ onChange: refreshQueue });
    await refreshQueue();
    if (result.uploaded > 0) {
      setMessage(copy.synced);
      window.setTimeout(() => setMessage(""), 2800);
      window.dispatchEvent(new CustomEvent("zommy:memories-synced"));
    } else {
      setMessage("");
    }
  };

  useEffect(() => {
    const splash = document.getElementById("zommy-splash");
    if (splash) {
      splash.style.opacity = "0";
      splash.style.transition = "opacity 220ms ease";
      window.setTimeout(() => splash.remove(), 260);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed", error));
    }

    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      if (!isStandalone() && localStorage.getItem("zommy_install_dismissed") !== "1") setShowInstall(true);
    };

    const installed = () => {
      setShowInstall(false);
      setInstallEvent(null);
      localStorage.setItem("zommy_install_dismissed", "1");
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    const onOnline = () => {
      setOnline(true);
      runFlush();
    };
    const onOffline = () => setOnline(false);
    const onResume = () => {
      if (document.visibilityState === "hidden") return;
      window.dispatchEvent(new CustomEvent("zommy:app-resume"));
      refreshQueue();
      runFlush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onResume);

    refreshQueue();
    runFlush();

    const queueUpdated = () => refreshQueue();
    window.addEventListener("zommy:queue-updated", queueUpdated);

    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add-memory") {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer")), 650);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("zommy:queue-updated", queueUpdated);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setShowInstall(false);
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    localStorage.setItem("zommy_install_dismissed", "1");
    setShowInstall(false);
  };

  return (
    <>
      {(!online || queuedCount > 0 || message) && (
        <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 2100, maxWidth: "min(92vw, 430px)", background: online ? palette.surface : palette.dangerSoft, color: online ? palette.stone : palette.danger, border: "none", borderRadius: 999, padding: "9px 13px", fontSize: 12, fontWeight: type.weight.ui, boxShadow: palette.shadow, fontFamily: type.sans }}>
          {!online ? copy.offline : message || copy.queued(queuedCount)}
        </div>
      )}

      {showInstall && installEvent && (
        <div style={{ position: "fixed", left: 20, right: 20, bottom: "calc(88px + env(safe-area-inset-bottom, 0px))", zIndex: 2100, display: "flex", justifyContent: "center", fontFamily: type.sans }}>
          <section style={{ width: "100%", maxWidth: 452, background: palette.surface, color: palette.stone, border: "none", borderRadius: 20, padding: 16, boxShadow: palette.sideShadow, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img src="/icons/icon.svg" alt="" style={{ width: 42, height: 42, borderRadius: 12 }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: type.weight.heading }}>{copy.installTitle}</div>
                <div style={{ color: palette.muted, fontSize: 13, lineHeight: 1.45, marginTop: 2 }}>{copy.installBody}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <button onClick={dismissInstall} style={{ border: `1px solid ${palette.line}`, background: palette.surface, color: palette.muted, borderRadius: 14, minHeight: 48, fontWeight: type.weight.ui }}>{copy.later}</button>
              <button onClick={install} style={{ border: "none", background: palette.accent, color: palette.surface, borderRadius: 14, minHeight: 48, fontWeight: type.weight.heading }}>{copy.install}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
