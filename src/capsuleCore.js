import { supabase } from "./supabase";

export const CAPSULE_SETUP_ERROR = "CAPSULE_TABLES_MISSING";

const TAG_LABELS = {
  en: {
    "first-steps": "first steps",
    "first-word": "first words",
    birthday: "birthday moments",
    illness: "hard days",
    trip: "little trips",
    school: "school moments",
    family: "family time",
  },
  pt: {
    "first-steps": "primeiros passos",
    "first-word": "primeiras palavras",
    birthday: "aniversários",
    illness: "dias difíceis",
    trip: "pequenas viagens",
    school: "momentos de escola",
    family: "tempo em família",
  },
};

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

export const readableMonth = (periodStart, lang = "en") => new Date(`${periodStart}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  month: "long",
  year: "numeric",
});

export const capsuleIdForMonth = (userId, profileId, periodStart) => `monthly-${userId}-${profileId}-${periodStart.slice(0, 7)}`;

export const entriesForPeriod = (entries, profileId, start, end) => entries
  .filter((entry) => entry.profile_id === profileId && entry.date >= start && entry.date <= end)
  .sort((a, b) => a.date.localeCompare(b.date));

const uniq = (items) => Array.from(new Set(items.filter(Boolean)));
const entryTags = (entries) => uniq(entries.flatMap((entry) => Array.isArray(entry.tags) ? entry.tags : []));
const humanTags = (tags, lang = "en") => tags.map((tag) => TAG_LABELS[lang]?.[tag] || tag.replaceAll("-", " "));
const usefulNotes = (entries) => entries.map((entry) => (entry.note || "").trim()).filter((note) => note.length > 0).sort((a, b) => b.length - a.length);

export const suggestEntriesForChapter = (entries) => {
  const favorites = entries.filter((entry) => entry.favorite);
  const milestones = entries.filter((entry) => Array.isArray(entry.tags) && entry.tags.length > 0);
  const withNotes = entries.filter((entry) => (entry.note || "").trim().length > 0);
  const selected = [];
  [...favorites, ...milestones, ...withNotes, ...entries].forEach((entry) => {
    if (!selected.some((item) => item.id === entry.id)) selected.push(entry);
  });
  return selected.slice(0, Math.max(3, Math.min(12, selected.length || entries.length)));
};

export const chapterDraft = ({ profile, entries, periodStart, lang = "en" }) => {
  const name = profile?.name || (lang === "pt" ? "esta criança" : "your child");
  const month = readableMonth(periodStart, lang);
  const favorites = entries.filter((entry) => entry.favorite);
  const tags = humanTags(entryTags(entries), lang);
  const notes = usefulNotes(entries);
  const count = entries.length;
  const photoCount = entries.reduce((total, entry) => total + (Array.isArray(entry.photos) && entry.photos.length ? entry.photos.length : 1), 0);

  if (lang === "pt") {
    if (!count) {
      return {
        title: `${name} · ${month}`,
        letter: `Este capítulo ainda está à espera dos primeiros momentos de ${name}. Guarda uma foto, uma frase ou uma pequena coisa que não queres perder.`,
        summary: "Ainda não há memórias suficientes para criar uma história.",
      };
    }

    const theme = tags[0] || (favorites.length ? "momentos que valeram a pena guardar" : "pequenos momentos do mês");
    const title = `${name} · ${theme}`;
    const lines = [
      `Este foi um mês com ${count} ${count === 1 ? "memória guardada" : "memórias guardadas"} de ${name}.`,
      photoCount > count ? `No total, ficaram ${photoCount} fotos e pequenos detalhes que ajudam a contar esta fase.` : "Mesmo uma memória pequena já ajuda a contar esta fase.",
    ];

    if (tags.length) lines.push(`Alguns fios deste capítulo: ${tags.slice(0, 3).join(", ")}.`);
    if (favorites.length) lines.push(`${favorites.length === 1 ? "Uma memória foi marcada" : `${favorites.length} memórias foram marcadas`} como especialmente importante.`);
    if (notes.length) lines.push(`Momentos que se destacam: ${notes.slice(0, 3).join(" · ")}.`);
    lines.push("Antes de fechar este capítulo, acrescenta o que só tu saberias dizer sobre este mês.");

    return { title, letter: lines.join("\n\n"), summary: `${count} memórias · ${photoCount} fotos · ${favorites.length} favoritas` };
  }

  if (!count) {
    return {
      title: `${name} · ${month}`,
      letter: `This chapter is still waiting for ${name}'s first moments of the month. Save a photo, a sentence, or one tiny thing you do not want to lose.`,
      summary: "Not enough memories yet to create a story.",
    };
  }

  const theme = tags[0] || (favorites.length ? "moments worth keeping" : "small moments from the month");
  const title = `${name} · ${theme}`;
  const lines = [
    `This was a month with ${count} saved ${count === 1 ? "memory" : "memories"} of ${name}.`,
    photoCount > count ? `Altogether, ${photoCount} photos and small details started to tell the shape of this stage.` : "Even one small memory helps tell the shape of this stage.",
  ];

  if (tags.length) lines.push(`A few threads run through this chapter: ${tags.slice(0, 3).join(", ")}.`);
  if (favorites.length) lines.push(`${favorites.length === 1 ? "One memory was marked" : `${favorites.length} memories were marked`} as especially worth keeping.`);
  if (notes.length) lines.push(`A few moments stood out: ${notes.slice(0, 3).join(" · ")}.`);
  lines.push("Before locking this chapter, add the part only you would know about this month.");

  return { title, letter: lines.join("\n\n"), summary: `${count} memories · ${photoCount} photos · ${favorites.length} favorites` };
};

export const monthTitle = (profile, periodStart, lang = "en") => chapterDraft({ profile, entries: [], periodStart, lang }).title;

export const getOrCreateMonthlyCapsule = async ({ user, profile, entries, period = monthBounds(), lang = "en" }) => {
  const id = capsuleIdForMonth(user.id, profile.id, period.start);
  const periodEntries = entriesForPeriod(entries, profile.id, period.start, period.end);
  const suggested = suggestEntriesForChapter(periodEntries);
  const draft = chapterDraft({ profile, entries: periodEntries, periodStart: period.start, lang });

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
        title: draft.title,
        letter: draft.letter,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) throw new Error(CAPSULE_SETUP_ERROR);
      throw error;
    }
    capsule = data;
  } else if (capsule.status !== "locked" && (!capsule.letter || capsule.letter.includes("still waiting") || capsule.letter.includes("ainda está à espera"))) {
    const { data, error } = await supabase
      .from("capsules")
      .update({ title: draft.title, letter: draft.letter })
      .eq("id", id)
      .select("*")
      .single();
    if (!error && data) capsule = data;
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
    return { capsule, items: rows, entries: periodEntries, selectedEntries: suggested, draft, setupMissing: false };
  }

  const selectedEntries = (items || [])
    .map((item) => periodEntries.find((entry) => String(entry.id) === String(item.entry_id)))
    .filter(Boolean);

  return { capsule, items: items || [], entries: periodEntries, selectedEntries, draft, setupMissing: false };
};

export const saveCapsule = async ({ capsuleId, title, letter }) => {
  const { error } = await supabase.from("capsules").update({ title, letter }).eq("id", capsuleId);
  if (error) throw error;
};

export const saveCapsuleLetter = async ({ capsuleId, letter }) => saveCapsule({ capsuleId, letter });

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
