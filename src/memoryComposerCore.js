import { clearDraft, getDraft, putDraft } from "./pwaStorage";
import { queueMemoryDraft } from "./pwaUploadQueue";
import { supabase } from "./supabase";

export const COPY = {
  en: {
    title: (name) => `Add ${name} memory`,
    chooseChild: "Who is this memory for?",
    date: "Date",
    photos: "Photos",
    addPhotos: "Upload photos",
    takePhoto: "Take photo",
    note: "Note",
    notePlaceholder: "What happened? Keep it short, imperfect, real.",
    coverCrop: "Cover crop",
    cropHint: "Choose where the tall timeline tile should focus.",
    top: "Top",
    center: "Center",
    bottom: "Bottom",
    cover: "Cover",
    save: "Save memory",
    retry: "Retry upload",
    cancel: "Cancel",
    compressing: (index, total) => `Preparing ${index}/${total}`,
    uploading: (index, total, pct) => `Uploading ${index}/${total} · ${pct}%`,
    saving: "Saving memory…",
    queued: "Saved offline. It will upload when connection returns.",
    draftRestored: "Draft restored.",
    done: "Memory saved.",
    genericError: "Upload failed. Your photos and note are still here.",
    photoError: "Add at least one photo.",
    profileError: "Choose a child first.",
  },
  pt: {
    title: (name) => `Adicionar memória de ${name}`,
    chooseChild: "Para quem é esta memória?",
    date: "Data",
    photos: "Fotos",
    addPhotos: "Carregar fotos",
    takePhoto: "Tirar foto",
    note: "Nota",
    notePlaceholder: "O que aconteceu? Curto, imperfeito, real.",
    coverCrop: "Corte da capa",
    cropHint: "Escolhe onde a tile alta da timeline deve focar.",
    top: "Topo",
    center: "Centro",
    bottom: "Fundo",
    cover: "Capa",
    save: "Guardar memória",
    retry: "Tentar de novo",
    cancel: "Cancelar",
    compressing: (index, total) => `A preparar ${index}/${total}`,
    uploading: (index, total, pct) => `A carregar ${index}/${total} · ${pct}%`,
    saving: "A guardar memória…",
    queued: "Guardada offline. Vai carregar quando a ligação voltar.",
    draftRestored: "Rascunho recuperado.",
    done: "Memória guardada.",
    genericError: "O upload falhou. As fotos e a nota continuam aqui.",
    photoError: "Adiciona pelo menos uma foto.",
    profileError: "Escolhe primeiro uma criança.",
  },
};

export const cropOptions = [
  { id: "top", value: "50% 18%" },
  { id: "center", value: "50% 50%" },
  { id: "bottom", value: "50% 82%" },
];

export const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

export const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

export const getComposerCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;
export const makePhotoId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const photoFromFile = (file) => ({ id: makePhotoId(), file, preview: URL.createObjectURL(file) });
export const photosFromDraft = (draft) => (draft?.photos || []).map((photo) => photoFromFile(photo.file || photo.blob || photo));
export const serializePhotos = (photos) => photos.map((photo) => ({ file: photo.file }));
export const revokePhotoPreviews = (photos) => photos.forEach((photo) => { if (photo.preview) URL.revokeObjectURL(photo.preview); });

export const loadComposerContext = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user || null;
  if (!user) return { user: null, profiles: [], draft: null };

  const [{ data: profiles }, draft] = await Promise.all([
    supabase.from("profiles").select("id,name,emoji,color,created_at").eq("user_id", user.id).is("archived_at", null).order("created_at"),
    getDraft().catch(() => null),
  ]);

  return { user, profiles: profiles || [], draft };
};

export const persistComposerDraft = ({ profileId, date, note, photos, coverIndex, coverPosition }) => putDraft({ profileId, date, note, photos: serializePhotos(photos), coverIndex, coverPosition });

export const queueCurrentMemory = async ({ user, activeProfile, date, note, photos, coverIndex, coverPosition }) => {
  await queueMemoryDraft({ userId: user.id, profileId: activeProfile.id, date, note, photos: serializePhotos(photos), coverIndex, coverPosition });
  await clearDraft().catch(() => null);
  window.dispatchEvent(new CustomEvent("zommy:queue-updated"));
};

export const validateComposer = ({ user, activeProfile, photos, copy }) => {
  if (!activeProfile) return copy.profileError;
  if (!photos.length) return copy.photoError;
  if (!user) return copy.genericError;
  return "";
};

export const statusTextForUpload = (copy, status) => {
  if (status.stage === "compressing") return copy.compressing(status.index, status.total);
  if (status.stage === "uploading") return copy.uploading(status.index, status.total, status.pct);
  if (status.stage === "saving") return copy.saving;
  return "";
};
