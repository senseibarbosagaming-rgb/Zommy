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

export function AppShellProvider({ children }) {
  const [activeScreen, setActiveScreenState] = useState(null);
  const [activeProfileId, setActiveProfileIdState] = useState("");
  const activeScreenRef = useRef(null);
  const activeProfileIdRef = useRef("");
  const ensuringDefault = useRef(false);

  const publishPrimaryScreen = useCallback((screen, profileId = activeProfileIdRef.current) => {
    activeScreenRef.current = screen;
    activeProfileIdRef.current = profileId || "";
    setActiveScreenState(screen);
    setActiveProfileIdState(profileId || "");
    dispatch("zommy:primary-screen-changed", { screen, profileId: profileId || "" });
  }, []);

  const setActiveProfileId = useCallback((profileId) => {
    activeProfileIdRef.current = profileId || "";
    setActiveProfileIdState(profileId || "");
    dispatch("zommy:active-profile-changed", { profileId: profileId || "", screen: activeScreenRef.current });
  }, []);

  const hideOtherPrimaryScreens = useCallback((screenToKeep) => {
    Object.entries(PRIMARY_SCREENS).forEach(([screen, config]) => {
      if (screen !== screenToKeep) dispatch(config.hide);
    });
  }, []);

  const openPrimaryScreen = useCallback((screen, detail = {}) => {
    const config = PRIMARY_SCREENS[screen];
    if (!config) return;
    const profileId = detail.profileId || activeProfileIdRef.current || "";
    hideOtherPrimaryScreens(screen);
    publishPrimaryScreen(screen, profileId);
    dispatch(config.show, { ...detail, profileId });
  }, [hideOtherPrimaryScreens, publishPrimaryScreen]);

  const clearPrimaryScreen = useCallback((screen = activeScreenRef.current) => {
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
        hideOtherPrimaryScreens(screen);
        publishPrimaryScreen(screen, profileId);
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
      Object.values(PRIMARY_SCREENS).forEach((config) => dispatch(config.hide));
      publishPrimaryScreen(null, "");
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(authListener);

    ensureDefaultPrimaryScreen();
    window.addEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:profiles-changed", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:memories-synced", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:app-resume", ensureDefaultPrimaryScreen);
    window.addEventListener("pageshow", ensureDefaultPrimaryScreen);
    document.addEventListener("visibilitychange", visibleDefaultListener);

    return () => {
      showHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
      hideHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
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
