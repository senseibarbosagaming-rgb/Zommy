import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

const PRIMARY_SCREENS = {
  today: { show: "zommy:show-today", hide: "zommy:hide-today" },
  timeline: { show: "zommy:show-timeline", hide: "zommy:hide-timeline" },
  compare: { show: "zommy:show-compare", hide: "zommy:hide-compare" },
  settings: { show: "zommy:show-settings", hide: "zommy:hide-settings" },
};

const SHOW_TO_SCREEN = Object.entries(PRIMARY_SCREENS).reduce((events, [screen, config]) => {
  events[config.show] = screen;
  return events;
}, {});

const dispatch = (eventName, detail) => window.dispatchEvent(new CustomEvent(eventName, { detail }));

export default function AppScreenCoordinator() {
  const activeScreen = useRef(null);
  const lastProfileId = useRef("");
  const ensuringDefault = useRef(false);

  useEffect(() => {
    const hideOtherPrimaryScreens = (screenToKeep) => {
      Object.entries(PRIMARY_SCREENS).forEach(([screen, config]) => {
        if (screen !== screenToKeep) dispatch(config.hide);
      });
    };

    const announcePrimaryScreen = (screen, detail = {}) => {
      activeScreen.current = screen;
      if (detail.profileId) lastProfileId.current = detail.profileId;
      dispatch("zommy:primary-screen-changed", { screen, profileId: detail.profileId || lastProfileId.current || "" });
    };

    const showHandlers = Object.entries(SHOW_TO_SCREEN).map(([eventName, screen]) => {
      const handler = (event) => {
        hideOtherPrimaryScreens(screen);
        announcePrimaryScreen(screen, event.detail || {});
      };
      window.addEventListener(eventName, handler);
      return [eventName, handler];
    });

    const hideHandlers = Object.entries(PRIMARY_SCREENS).map(([screen, config]) => {
      const handler = () => {
        if (activeScreen.current !== screen) return;
        activeScreen.current = null;
        dispatch("zommy:primary-screen-changed", { screen: null, profileId: lastProfileId.current || "" });
      };
      window.addEventListener(config.hide, handler);
      return [config.hide, handler];
    });

    const resetPrimaryScreens = () => {
      activeScreen.current = null;
      Object.values(PRIMARY_SCREENS).forEach((config) => dispatch(config.hide));
      dispatch("zommy:primary-screen-changed", { screen: null, profileId: lastProfileId.current || "" });
    };

    const ensureDefaultPrimaryScreen = async () => {
      if (ensuringDefault.current || activeScreen.current) return;
      ensuringDefault.current = true;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user || activeScreen.current) return;

        const { count, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("archived_at", null);

        if (!error && count > 0 && !activeScreen.current) dispatch(PRIMARY_SCREENS.today.show);
      } finally {
        ensuringDefault.current = false;
      }
    };

    const authListener = (_event, session) => {
      if (!session?.user) {
        resetPrimaryScreens();
        return;
      }
      window.setTimeout(ensureDefaultPrimaryScreen, 0);
    };

    const visibilityListener = () => {
      if (document.visibilityState !== "hidden") ensureDefaultPrimaryScreen();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(authListener);

    ensureDefaultPrimaryScreen();
    window.addEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:profiles-changed", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:memories-synced", ensureDefaultPrimaryScreen);
    window.addEventListener("zommy:app-resume", ensureDefaultPrimaryScreen);
    window.addEventListener("pageshow", ensureDefaultPrimaryScreen);
    document.addEventListener("visibilitychange", visibilityListener);

    return () => {
      showHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
      hideHandlers.forEach(([eventName, handler]) => window.removeEventListener(eventName, handler));
      window.removeEventListener("zommy:ensure-primary-screen", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:profiles-changed", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:memories-synced", ensureDefaultPrimaryScreen);
      window.removeEventListener("zommy:app-resume", ensureDefaultPrimaryScreen);
      window.removeEventListener("pageshow", ensureDefaultPrimaryScreen);
      document.removeEventListener("visibilitychange", visibilityListener);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
