import { supabase } from "./supabase";

export const CAPSULE_SETUP_ERROR = "CAPSULE_TABLES_MISSING";

const isMissingTableError = (error) => {
  const text = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
  return text.includes("capsules") || text.includes("capsule_items") || text.includes("42p01") || text.includes("does not exist");
};

export const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export const monthBounds = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toIso = (value) => {
    const next = new Date(value);
    next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
    return next.toISOString().slice(0, 10);
  };
  return { start: toIso(start), end: toIso(end), year, month: month + 1 };
};

export const monthTitle = (profile, periodStart, lang = "en") => {
  const month = new Date(`${periodStart}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" });
  return `${profile?.name || "Child"} · ${month}`;
};

export const capsuleIdForMonth = (userId, profileId, periodStart) => `monthly-${userId}-${profileId}-${periodStart.slice(0, 7)}`;

export const entriesForPeriod = (entries, profileId, start, end) => entries
  .filter((entry) => entry.profile_id === profileId && entry.date >= start && entry.date <= end)
  .sort((a, b) => a.date.localeCompare(b.date));

export const suggestEntriesForChapter = (entries) => {
  const favorites = entries.filter((entry) => entry.favorite);
  const milestones = entries.filter((entry) => Array.isArray(entry.tags) && entry.tags.length > 0);
  const selected = [];
  [...favorites, ...milestones, ...entries].forEach((entry) => {
    if (!selected.some((item) => item.id === entry.id)) selected.push(entry);
  });
  return selected.slice(0, Math.max(3, Math.min(12, selected.length || entries.length)));
};

export const starterLetter = ({ profile, entries, lang = "en" }) => {
  if (lang === "pt") {
    if (!entries.length) return `Este mês ainda está por escrever. Começa por guardar alguns momentos de ${profile?.name || "esta criança"}.`;
    const bits = entries.slice(0, 3).map((entry) => entry.note).filter(Boolean);
    return `Este mês de ${profile?.name || "crescimento"} teve ${entries.length} ${entries.length === 1 ? "memória guardada" : "memórias guardadas"}.${bits.length ? ` Momentos que se destacam: ${bits.join(" · ")}.` : ""}`;
  }

  if (!entries.length) return `This month is still waiting to be written. Start by saving a few moments for ${profile?.name || "this child"}.`;
  const bits = entries.slice(0, 3).map((entry) => entry.note).filter(Boolean);
  return `This month, ${profile?.name || "your child"} had ${entries.length} saved ${entries.length === 1 ? "memory" : "memories"}.${bits.length ? ` A few moments stood out: ${bits.join(" · ")}.` : ""}`;
};

export const getOrCreateMonthlyCapsule = async ({ user, profile, entries, period = monthBounds(), lang = "en" }) => {
  const id = capsuleIdForMonth(user.id, profile.id, period.start);
  const title = monthTitle(profile, period.start, lang);
  const periodEntries = entriesForPeriod(entries, profile.id, period.start, period.end);
  const suggested = suggestEntriesForChapter(periodEntries);

  const { data: existing, error: existingError } = await supabase
    .from("capsules")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    if (isMissingTableError(existingError)) throw new Error(CAPSULE_SETUP_ERROR);
    throw existingError;
  }

  let capsule = existing;

  if (!capsule) {
    const { data, error } = await supabase
      .from("capsules")
      .insert({
        id,
        user_id: user.id,
        profile_id: profile.id,
        type: "monthly",
        period_start: period.start,
        period_end: period.end,
        title,
        letter: starterLetter({ profile, entries: periodEntries, lang }),
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) throw new Error(CAPSULE_SETUP_ERROR);
      throw error;
    }
    capsule = data;
  }

  const { data: items, error: itemsError } = await supabase
    .from("capsule_items")
    .select("*")
    .eq("capsule_id", id)
    .order("sort_order");

  if (itemsError) {
    if (isMissingTableError(itemsError)) throw new Error(CAPSULE_SETUP_ERROR);
    throw itemsError;
  }

  if (!items?.length && suggested.length) {
    const rows = suggested.map((entry, index) => ({
      id: `${id}-${entry.id}`,
      capsule_id: id,
      entry_id: entry.id,
      sort_order: index,
      highlight_note: "",
    }));
    const { error } = await supabase.from("capsule_items").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    return { capsule, items: rows, entries: periodEntries, selectedEntries: suggested, setupMissing: false };
  }

  const selectedEntries = (items || [])
    .map((item) => periodEntries.find((entry) => String(entry.id) === String(item.entry_id)))
    .filter(Boolean);

  return { capsule, items: items || [], entries: periodEntries, selectedEntries, setupMissing: false };
};

export const saveCapsuleLetter = async ({ capsuleId, letter }) => {
  const { error } = await supabase.from("capsules").update({ letter }).eq("id", capsuleId);
  if (error) throw error;
};

export const lockCapsule = async ({ capsuleId, locked }) => {
  const { error } = await supabase.from("capsules").update({ status: locked ? "locked" : "draft", locked_at: locked ? new Date().toISOString() : null }).eq("id", capsuleId);
  if (error) throw error;
};

export const replaceCapsuleItems = async ({ capsuleId, entryIds }) => {
  const { error: deleteError } = await supabase.from("capsule_items").delete().eq("capsule_id", capsuleId);
  if (deleteError) throw deleteError;
  if (!entryIds.length) return;
  const rows = entryIds.map((entryId, index) => ({ id: `${capsuleId}-${entryId}`, capsule_id: capsuleId, entry_id: entryId, sort_order: index }));
  const { error } = await supabase.from("capsule_items").insert(rows);
  if (error) throw error;
};
