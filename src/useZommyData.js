import { useCallback, useEffect, useState } from "react";
import { getDraft, getQueuedCount } from "./pwaStorage";
import { supabase } from "./supabase";

export const coverPath = (entry) => entry?.cover_photo_path || entry?.photo_path || entry?.photo || entry?.photos?.[0]?.path || "";

const isExternal = (value) => /^https?:\/\//i.test(value || "") || /^data:/i.test(value || "");

export const signedPhoto = async (pathOrUrl) => {
  if (!pathOrUrl || isExternal(pathOrUrl)) return pathOrUrl || "";
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(pathOrUrl, 60 * 60);
  return error ? "" : data.signedUrl;
};

export const loadZommyData = async ({ includeEntries = true, includeLocal = false, entryLimit = 80 } = {}) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user || null;

  if (!user) {
    return {
      user: null,
      profiles: [],
      entries: [],
      memoryCount: 0,
      draft: null,
      queuedCount: 0,
    };
  }

  const requests = [
    supabase.from("profiles").select("*").is("archived_at", null).order("created_at"),
    supabase.from("entries").select("id", { count: "exact", head: true }),
  ];

  if (includeEntries) {
    requests.push(supabase.from("entries").select("*").order("date", { ascending: false }).limit(entryLimit));
  }

  if (includeLocal) {
    requests.push(getDraft().catch(() => null));
    requests.push(getQueuedCount().catch(() => 0));
  }

  const results = await Promise.all(requests);
  const profileResult = results[0];
  const countResult = results[1];
  const entryResult = includeEntries ? results[2] : { data: [] };
  const draft = includeLocal ? results[includeEntries ? 3 : 2] : null;
  const queuedCount = includeLocal ? results[includeEntries ? 4 : 3] || 0 : 0;

  if (profileResult.error) throw profileResult.error;
  if (countResult.error) throw countResult.error;
  if (includeEntries && entryResult.error) throw entryResult.error;

  const entries = includeEntries
    ? await Promise.all((entryResult.data || []).map(async (entry) => ({
      ...entry,
      photoUrl: await signedPhoto(coverPath(entry)),
    })))
    : [];

  return {
    user,
    profiles: profileResult.data || [],
    entries,
    memoryCount: countResult.count || 0,
    draft: draft || null,
    queuedCount,
  };
};

export function useZommyData(options = {}) {
  const [state, setState] = useState({
    user: null,
    profiles: [],
    entries: [],
    memoryCount: 0,
    draft: null,
    queuedCount: 0,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loadZommyData(options);
      setState({ ...data, loading: false, error: null });
      return data;
    } catch (error) {
      console.warn("Failed to load Zommy data", error);
      setState((current) => ({ ...current, loading: false, error }));
      return null;
    }
  }, [options.includeEntries, options.includeLocal, options.entryLimit]);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(refresh);

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };

    const events = [
      [window, "focus", refresh],
      [window, "pageshow", refreshWhenVisible],
      [window, "online", refreshWhenVisible],
      [window, "zommy:app-resume", refreshWhenVisible],
      [window, "zommy:profiles-changed", refresh],
      [window, "zommy:queue-updated", refresh],
      [window, "zommy:memories-synced", refresh],
      [window, "zommy:sharing-changed", refresh],
      [document, "visibilitychange", refreshWhenVisible],
    ];
    events.forEach(([target, eventName, handler]) => target.addEventListener(eventName, handler));

    return () => {
      subscription.unsubscribe();
      events.forEach(([target, eventName, handler]) => target.removeEventListener(eventName, handler));
    };
  }, [refresh]);

  return { ...state, refresh };
}
