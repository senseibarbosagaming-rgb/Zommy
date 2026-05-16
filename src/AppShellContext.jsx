// AppShellContext.jsx
//
// WHAT CHANGED vs the old version
// ─────────────────────────────────────────────────────────────────────────────
// BEFORE: Every screen mounted itself unconditionally and listened for
//         `zommy:show-X` / `zommy:hide-X` window events to toggle its own
//         `open` state. This meant 20+ components always in the DOM, event
//         timing races (a show event fired before a component's useEffect
//         registered its listener silently did nothing), and two independent
//         sources of truth (AppShellContext.activeScreen + each screen's own
//         `open` boolean) that could drift apart.
//
// AFTER:  AppShellContext is the single source of truth. Screens no longer
//         mount themselves — App.jsx renders only the active screen based on
//         `activeScreen`. The old window events are still dispatched so that
//         any remaining code that listens for them (MemoryComposer, overlays,
//         etc.) keeps working without changes. The public API of the context
//         (openPrimaryScreen, clearPrimaryScreen, activeScreen, activeProfileId,
//         setActiveProfileId, ensureDefaultPrimaryScreen, hasPrimaryScreen) is
//         100% unchanged — all consumer components work without modification.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";

export const PRIMARY_SCREENS = {
  today:    { show: "zommy:show-today",          hide: "zommy:hide-today" },
  timeline: { show: "zommy:show-timeline",       hide: "zommy:hide-timeline" },
  compare:  { show: "zommy:show-compare",        hide: "zommy:hide-compare" },
  family:   { show: "zommy:show-family-sharing", hide: "zommy:hide-family-sharing" },
  settings: { show: "zommy:show-settings",       hide: "zommy:hide-settings" },
};

const AppShellContext = createContext(null);

const dispatch = (eventName, detail) =>
  window.dispatchEvent(new CustomEvent(eventName, { detail }));

const isPrimaryScreen = (screen) => Boolean(PRIMARY_SCREENS[screen]);

export function AppShellProvider({ children }) {
  const [activeScreen, setActiveScreenState] = useState(null);
  const [activeProfileId, setActiveProfileIdState] = useState("");

  // Refs mirror state so callbacks always see the latest value without
  // stale-closure issues, regardless of when they were created.
  const activeScreenRef = useRef(null);
  const activeProfileIdRef = useRef("");

  // Guards to prevent re-entrant / concurrent operations
  const ensuringDefault = useRef(false);
  const applyingHistory = useRef(false);
  const switchingScreen = useRef(false);

  // ─── history helpers ──────────────────────────────────────────────────────

  const writeHistoryEntry = useCallback((screen, profileId, replace = false) => {
    if (!isPrimaryScreen(screen) || applyingHistory.current) return;

    const nextState = {
      ...(window.history.state || {}),
      zommy: true,
      screen,
      profileId: profileId || "",
    };

    const current = window.history.state || {};
    if (
      current.zommy &&
      current.screen === screen &&
      (current.profileId || "") === (profileId || "")
    ) return;

    if (replace) window.history.replaceState(nextState, "", window.location.href);
    else         window.history.pushState(nextState,    "", window.location.href);
  }, []);

  // ─── core state setter ────────────────────────────────────────────────────
  // Single place that updates both the ref and the React state, and dispatches
  // the cross-component event so any legacy listeners stay in sync.

  const publishScreen = useCallback((screen, profileId = activeProfileIdRef.current) => {
    const prevScreen    = activeScreenRef.current;
    const prevProfileId = activeProfileIdRef.current;
    const nextProfileId = profileId || "";

    activeScreenRef.current    = screen;
    activeProfileIdRef.current = nextProfileId;
    setActiveScreenState(screen);
    setActiveProfileIdState(nextProfileId);

    dispatch("zommy:primary-screen-changed", { screen, profileId: nextProfileId });

    if (screen && !applyingHistory.current) {
      const replace = !prevScreen;
      const changed = prevScreen !== screen || prevProfileId !== nextProfileId;
      if (changed) writeHistoryEntry(screen, nextProfileId, replace);
    }
  }, [writeHistoryEntry]);

  // ─── public API ───────────────────────────────────────────────────────────

  const setActiveProfileId = useCallback((profileId) => {
    const next = profileId || "";
    activeProfileIdRef.current = next;
    setActiveProfileIdState(next);
    dispatch("zommy:active-profile-changed", {
      profileId: next,
      screen: activeScreenRef.current,
    });
    if (activeScreenRef.current && !applyingHistory.current) {
      writeHistoryEntry(activeScreenRef.current, next, true);
    }
  }, [writeHistoryEntry]);

  const openPrimaryScreen = useCallback((screen, detail = {}) => {
    const config = PRIMARY_SCREENS[screen];
    if (!config) return;

    const profileId = detail.profileId || activeProfileIdRef.current || "";

    switchingScreen.current = true;

    // Dispatch hide events for all other screens (keeps legacy listeners happy)
    Object.entries(PRIMARY_SCREENS).forEach(([key, cfg]) => {
      if (key !== screen) dispatch(cfg.hide);
    });

    publishScreen(screen, profileId);

    // Dispatch show event so any direct event listeners (e.g. in overlays) still fire
    dispatch(config.show, { ...detail, profileId });

    window.setTimeout(() => { switchingScreen.current = false; }, 0);
  }, [publishScreen]);

  const clearPrimaryScreen = useCallback((screen = activeScreenRef.current) => {
    if (switchingScreen.current) return;
    if (screen && activeScreenRef.current !== screen) return;
    publishScreen(null, activeProfileIdRef.current);
  }, [publishScreen]);

  const ensureDefaultPrimaryScreen = useCallback(async () => {
    if (ensuringDefault.current || activeScreenRef.current) return;
    ensuringDefault.current = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || activeScreenRef.current) return;

      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("archived_at", null);

      if (!error && count > 0 && !activeScreenRef.current) {
        openPrimaryScreen("today");
      }
    } finally {
      ensuringDefault.current = false;
    }
  }, [openPrimaryScreen]);

  // ─── effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Browser back/forward navigation
    const onPopState = (event) => {
      const state = event.state || {};
      if (!state.zommy || !isPrimaryScreen(state.screen)) return;

      applyingHistory.current  = true;
      switchingScreen.current  = true;

      Object.entries(PRIMARY_SCREENS).forEach(([key, cfg]) => {
        if (key !== state.screen) dispatch(cfg.hide);
      });

      publishScreen(state.screen, state.profileId || "");
      dispatch(PRIMARY_SCREENS[state.screen].show, { profileId: state.profileId || "" });

      window.setTimeout(() => {
        applyingHistory.current = false;
        switchingScreen.current = false;
      }, 0);
    };

    // Auth state changes
    const onAuthChange = (_event, session) => {
      if (!session?.user) {
        switchingScreen.current = true;
        Object.values(PRIMARY_SCREENS).forEach((cfg) => dispatch(cfg.hide));
        publishScreen(null, "");
        window.setTimeout(() => { switchingScreen.current = false; }, 0);
        return;
      }
      window.setTimeout(ensureDefaultPrimaryScreen, 0);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") ensureDefaultPrimaryScreen();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(onAuthChange);

    ensureDefaultPrimaryScreen();

    window.addEventListener("popstate", onPopState);
    window.addEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:profiles-changed",      ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:memories-synced",       ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:app-resume",            ensureDefaultPrimaryScreen);
    window.addEventListener("pageshow",                    ensureDefaultPrimaryScreen);
    document.addEventListener("visibilitychange",          onVisibilityChange);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:profiles-changed",      ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:memories-synced",       ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:app-resume",            ensureDefaultPrimaryScreen);
      window.removeEventListener("pageshow",                    ensureDefaultPrimaryScreen);
      document.removeEventListener("visibilitychange",          onVisibilityChange);
      subscription.unsubscribe();
    };
  }, [ensureDefaultPrimaryScreen, publishScreen]);

  // ─── context value ────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    activeProfileId,
    activeScreen,
    clearPrimaryScreen,
    ensureDefaultPrimaryScreen,
    hasPrimaryScreen: Boolean(activeScreen),
    openPrimaryScreen,
    setActiveProfileId,
  }), [
    activeProfileId,
    activeScreen,
    clearPrimaryScreen,
    ensureDefaultPrimaryScreen,
    openPrimaryScreen,
    setActiveProfileId,
  ]);

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export const useAppShell = () => {
  const context = useContext(AppShellContext);
  if (!context) throw new Error("useAppShell must be used within AppShellProvider");
  return context;
};
