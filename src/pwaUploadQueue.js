import { supabase } from "./supabase";
import { deleteQueuedMemory, getQueuedMemories, putQueuedMemory } from "./pwaStorage";

const IMAGE_READ_TIMEOUT_MS = 9000;
const IMAGE_COMPRESS_TIMEOUT_MS = 9000;
const UPLOAD_TIMEOUT_MS = 45000;

const withTimeout = (promise, ms, message) => new Promise((resolve, reject) => {
  const timeout = window.setTimeout(() => reject(new Error(message)), ms);
  promise
    .then((value) => {
      window.clearTimeout(timeout);
      resolve(value);
    })
    .catch((error) => {
      window.clearTimeout(timeout);
      reject(error);
    });
});

const readFileAsImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  const cleanup = () => URL.revokeObjectURL(url);
  image.onload = () => {
    cleanup();
    resolve(image);
  };
  image.onerror = () => {
    cleanup();
    reject(new Error("Could not read image"));
  };
  image.src = url;
});

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Could not compress image"));
  }, "image/jpeg", quality);
});

const shouldSkipCompression = (file) => {
  const type = (file.type || "").toLowerCase();
  if (!type.startsWith("image/")) return true;
  if (type.includes("heic") || type.includes("heif")) return true;
  if (type.includes("gif")) return true;
  return false;
};

export const compressImageForUpload = async (file) => {
  if (shouldSkipCompression(file)) return file;

  try {
    const image = await withTimeout(readFileAsImage(file), IMAGE_READ_TIMEOUT_MS, "Image decode timed out");
    const maxSide = 1800;
    const ratio = Math.min(1, maxSide / Math.max(image.width || 1, image.height || 1));
    const width = Math.max(1, Math.round((image.width || 1) * ratio));
    const height = Math.max(1, Math.round((image.height || 1) * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);
    const blob = await withTimeout(canvasToBlob(canvas, 0.78), IMAGE_COMPRESS_TIMEOUT_MS, "Image compression timed out");

    if (blob.size >= file.size && file.size < 2_000_000) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.warn("Image compression skipped", error);
    return file;
  }
};

export const uploadWithProgress = async ({ file, path, onProgress = () => {} }) => {
  let visualProgress = 8;
  onProgress(visualProgress);

  const progressTimer = window.setInterval(() => {
    visualProgress = Math.min(88, visualProgress + 8);
    onProgress(visualProgress);
  }, 1500);

  try {
    const { error } = await withTimeout(
      supabase.storage.from("photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      }),
      UPLOAD_TIMEOUT_MS,
      "Upload timed out",
    );

    if (error) throw error;
    onProgress(100);
    return path;
  } finally {
    window.clearInterval(progressTimer);
  }
};

export const queueMemoryDraft = async ({ userId, profileId, date, note, photos, coverIndex, coverPosition }) => {
  const id = `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await putQueuedMemory({ id, userId, profileId, date, note, photos, coverIndex, coverPosition });
  return id;
};

const ensureFreshSession = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const expiresAt = (data.session.expires_at || 0) * 1000;
  if (expiresAt && expiresAt - Date.now() < 5 * 60 * 1000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return refreshed.session;
  }
  return data.session;
};

export const uploadMemoryPayload = async ({ userId, profileId, date, note, photos, coverIndex, coverPosition, onStatus = () => {}, onProgress = () => {} }) => {
  await ensureFreshSession();
  const uploaded = [];

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    const file = photo.file || photo.blob || photo;
    onStatus({ stage: "compressing", index: i + 1, total: photos.length, pct: 0 });
    const compressed = await compressImageForUpload(file);
    const extension = (compressed.type || "").includes("png") ? "png" : (compressed.name || "").split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension) ? extension : "jpg";
    const path = `${userId}/${Date.now()}-${i}.${safeExtension}`;
    onStatus({ stage: "uploading", index: i + 1, total: photos.length, pct: 0 });
    await uploadWithProgress({
      file: compressed,
      path,
      onProgress: (pct) => {
        onProgress(Math.round(((i + pct / 100) / photos.length) * 100));
        onStatus({ stage: "uploading", index: i + 1, total: photos.length, pct });
      },
    });
    uploaded.push({ path, position: i === coverIndex ? coverPosition : "50% 50%" });
  }

  const cover = uploaded[coverIndex] || uploaded[0];
  onStatus({ stage: "saving" });
  const { error } = await supabase.from("entries").insert({
    id: Date.now(),
    user_id: userId,
    profile_id: profileId,
    date,
    note: note.trim(),
    photo_path: cover.path,
    cover_photo_path: cover.path,
    cover_position: cover.position,
    photos: uploaded,
  });

  if (error) throw error;
  onProgress(100);
};

export const flushQueuedUploads = async ({ onChange = () => {} } = {}) => {
  if (!navigator.onLine) return { uploaded: 0, remaining: await getQueuedMemories() };
  const queued = await getQueuedMemories();
  let uploaded = 0;

  for (const item of queued) {
    try {
      await uploadMemoryPayload({
        userId: item.userId,
        profileId: item.profileId,
        date: item.date,
        note: item.note || "",
        photos: item.photos || [],
        coverIndex: item.coverIndex || 0,
        coverPosition: item.coverPosition || "50% 50%",
      });
      await deleteQueuedMemory(item.id);
      uploaded += 1;
      onChange({ uploaded, remaining: queued.length - uploaded });
    } catch (error) {
      console.warn("Queued upload failed", error);
      break;
    }
  }

  return { uploaded, remaining: await getQueuedMemories() };
};
