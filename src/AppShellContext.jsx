import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";

export const PRIMARY_SCREENS = {
  today: { show: "zommy:show-today", hide: "zommy:hide-today" },
  timeline: { show: "zommy:show-timeline", hide: "zommy:hide-timeline" },
  compare: { show: "zommy:show-compare", hide: "zommy:hide-compare" },
  settings: { show: "zommy:show-settings", hide: "zommy:hide-settings" },
};

const SHOW_TO_SCREEN = Object.entries(PRIMARY_SCREENS).reduce((events, [screen, config]) => {
  events[config.show] = screen;
  return events;
}, {});

const HIDE_TO_SCREEN = Object.entries(PRIMARY_SCREENS).reduce((events, [screen, config]) => {
  events[config.hide] = screen;
  return events;
}, {});

const AppShellContext = createContext(null);
const dispatch = (eventName, detail) => window.dispatchEvent(new CustomEvent(eventName, { detail }));
const isPrimaryScreen = (screen) => Boolean(PRIMARY_SCREENS[screen]);

export function AppShellProvider({ children }) {
  const [activeScreen, setActiveScreenState] = useState(null);
  const [activeProfileId, setActiveProfileIdState] = useState("");
  const activeScreenRef = useRef(null);
  const activeProfileIdRef = useRef("");
  const ensuringDefault = useRef(false);
  const applyingHistory = useRef(false);
  const switchingPrimaryScreen = useRef(false);

  const writeHistoryEntry = useCallback((screen, profileId, replace = false) => {
    if (!isPrimaryScreen(screen) || applyingHistory.current || typeof window === "undefined") return;

    const nextState = {
      ...(window.history.state || {}),
      zommy: true,
      screen,
      profileId: profileId || "",
    };

    const currentState = window.history.state || {};
    if (currentState.zommy && currentState.screen === screen && (currentState.profileId || "") === (profileId || "")) return;

    if (replace) window.history.replaceState(nextState, "", window.location.href);
    else window.history.pushState(nextState, "", window.location.href);
  }, []);

  const publishPrimaryScreen = useCallback((screen, profileId = activeProfileIdRef.current) => {
    const previousScreen = activeScreenRef.current;
    const previousProfileId = activeProfileIdRef.current;
    const nextProfileId = profileId || "";

    activeScreenRef.current = screen;
    activeProfileIdRef.current = nextProfileId;
    setActiveScreenState(screen);
    setActiveProfileIdState(nextProfileId);
    dispatch("zommy:primary-screen-changed", { screen, profileId: nextProfileId });

    if (screen && !applyingHistory.current) {
      const replace = !previousScreen;
      const changed = previousScreen !== screen || previousProfileId !== nextProfileId;
      if (changed) writeHistoryEntry(screen, nextProfileId, replace);
    }
  }, [writeHistoryEntry]);

  const setActiveProfileId = useCallback((profileId) => {
    const nextProfileId = profileId || "";
    activeProfileIdRef.current = nextProfileId;
    setActiveProfileIdState(nextProfileId);
    dispatch("zommy:active-profile-changed", { profileId: nextProfileId, screen: activeScreenRef.current });
    if (activeScreenRef.current && !applyingHistory.current) writeHistoryEntry(activeScreenRef.current, nextProfileId, true);
  }, [writeHistoryEntry]);

  const hideOtherPrimaryScreens = useCallback((screenToKeep) => {
    Object.entries(PRIMARY_SCREENS).forEach(([screen, config]) => {
      if (screen !== screenToKeep) dispatch(config.hide);
    });
  }, []);

  const openPrimaryScreen = useCallback((screen, detail = {}) => {
    const config = PRIMARY_SCREENS[screen];
    if (!config) return;
    const profileId = detail.profileId || activeProfileIdRef.current || "";
    switchingPrimaryScreen.current = true;
    hideOtherPrimaryScreens(screen);
    publishPrimaryScreen(screen, profileId);
    dispatch(config.show, { ...detail, profileId });
    window.setTimeout(() => { switchingPrimaryScreen.current = false; }, 0);
  }, [hideOtherPrimaryScreens, publishPrimaryScreen]);

  const clearPrimaryScreen = useCallback((screen = activeScreenRef.current) => {
    if (switchingPrimaryScreen.current) return;
    if (screen && activeScreenRef.current !== screen) return;
    publishPrimaryScreen(null, activeProfileIdRef.current);
  }, [publishPrimaryScreen]);

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

      if (!error && count > 0 && !activeScreenRef.current) openPrimaryScreen("today");
    } finally {
      ensuringDefault.current = false;
    }
  }, [openPrimaryScreen]);

  useEffect(() => {
    const showHandlers = Object.entries(SHOW_TO_SCREEN).map(([eventName, screen]) => {
      const handler = (event) => {
        const profileId = event.detail?.profileId || activeProfileIdRef.current || "";
        switchingPrimaryScreen.current = true;
        hideOtherPrimaryScreens(screen);
        publishPrimaryScreen(screen, profileId);
        window.setTimeout(() => { switchingPrimaryScreen.current = false; }, 0);
      };
      window.addEventListener(eventName, handler);
      return [eventName, handler];
    });

    const hideHandlers = Object.entries(HIDE_TO_SCREEN).map(([eventName, screen]) => {
      const handler = () => clearPrimaryScreen(screen);
      window.addEventListener(eventName, handler);
      return [eventName, handler];
    });

    const resetPrimaryScreens = () => {
      switchingPrimaryScreen.current = true;
      Object.values(PRIMARY_SCREENS).forEach((config) => dispatch(config.hide));
      publishPrimaryScreen(null, "");
      window.setTimeout(() => { switchingPrimaryScreen.current = false; }, 0);
    };

    const authListener = (_event, session) => {
      if (!session?.user) {
        resetPrimaryScreens();
        return;
      }
      window.setTimeout(ensureDefaultPrimaryScreen, 0);
    };

    const visibleDefaultListener = () => {
      if (document.visibilityState !== "hidden") ensureDefaultPrimaryScreen();
    };

    const historyListener = (event) => {
      const state = event.state || {};
      if (!state.zommy || !isPrimaryScreen(state.screen)) return;

      applyingHistory.current = true;
      switchingPrimaryScreen.current = true;
      hideOtherPrimaryScreens(state.screen);
      publishPrimaryScreen(state.screen, state.profileId || "");
      dispatch(PRIMARY_SCREENS[state.screen].show, { profileId: state.profileId || "" });
      window.setTimeout(() => {
        applyingHistory.current = false;
        switchingPrimaryScreen.current = false;
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(authListener);

    ensureDefaultPrimaryScreen();
    window.addEventListener("popstate", historyListener);
    window.addEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:profiles-changed", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:memories-synced", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:app-resume", ensureDefaultPrimaryScreen);
    window.addEventListener("pageshow", ensureDefaultPrimaryScreen);
    document.addEventListener("visibilitychange", visibleDefaultListener);

    return () => {
      showHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
      hideHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
      window.removeEventListener("popstate", historyListener);
      window.removeEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:profiles-changed", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:memories-synced", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:app-resume", ensureDefaultPrimaryScreen);
      window.removeEventListener("pageshow", ensureDefaultPrimaryScreen);
      document.removeEventListener("visibilitychange", visibleDefaultListener);
      subscription.unsubscribe();
    };
  }, [clearPrimaryScreen, ensureDefaultPrimaryScreen, hideOtherPrimaryScreens, publishPrimaryScreen]);

  const value = useMemo(() => ({
    activeProfileId,
    activeScreen,
    clearPrimaryScreen,
    ensureDefaultPrimaryScreen,
    hasPrimaryScreen: Boolean(activeScreen),
    openPrimaryScreen,
    setActiveProfileId,
  }), [activeProfileId, activeScreen, clearPrimaryScreen, ensureDefaultPrimaryScreen, openPrimaryScreen, setActiveProfileId]);

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export const useAppShell = () => {
  const context = useContext(AppShellContext);
  if (!context) throw new Error("useAppShell must be used within AppShellProvider");
  return context;
};
