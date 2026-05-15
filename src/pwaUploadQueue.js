import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";
import { deleteQueuedMemory, getQueuedMemories, putQueuedMemory } from "./pwaStorage";

const IMAGE_READ_TIMEOUT_MS = 9000;
const IMAGE_COMPRESS_TIMEOUT_MS = 9000;
const UPLOAD_TIMEOUT_MS = 45000;
const UPLOAD_STALL_TIMEOUT_MS = 15000;

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

const getSessionToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || SUPABASE_ANON_KEY;
};

const uploadWithSupabaseClient = async ({ file, path, onProgress = () => {} }) => {
  onProgress(3);
  const { error } = await withTimeout(
    supabase.storage.from("photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    }),
    UPLOAD_TIMEOUT_MS,
    "Supabase upload timed out",
  );
  if (error) throw error;
  onProgress(100);
  return path;
};

export const uploadWithProgress = async ({ file, path, onProgress = () => {} }) => {
  const token = await getSessionToken();
  const endpoint = `${SUPABASE_URL}/storage/v1/object/photos/${encodeURIComponent(path).replace(/%2F/g, "/")}`;

  try {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let settled = false;
      let lastProgressAt = Date.now();

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearInterval(stallWatchdog);
        window.clearTimeout(totalWatchdog);
        callback(value);
      };

      const totalWatchdog = window.setTimeout(() => {
        try { xhr.abort(); } catch {}
        finish(reject, new Error("Upload timed out"));
      }, UPLOAD_TIMEOUT_MS);

      const stallWatchdog = window.setInterval(() => {
        if (settled) return;
        if (Date.now() - lastProgressAt > UPLOAD_STALL_TIMEOUT_MS) {
          try { xhr.abort(); } catch {}
          finish(reject, new Error("Upload stalled"));
        }
      }, 1000);

      xhr.open("POST", endpoint);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
      xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.timeout = UPLOAD_TIMEOUT_MS;

      xhr.upload.onloadstart = () => {
        lastProgressAt = Date.now();
        onProgress(1);
      };
      xhr.upload.onprogress = (event) => {
        lastProgressAt = Date.now();
        if (!event.lengthComputable) {
          onProgress(5);
          return;
        }
        onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
      };
      xhr.upload.onload = () => {
        lastProgressAt = Date.now();
        onProgress(98);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) finish(resolve, path);
        else finish(reject, new Error(xhr.responseText || `Upload failed with ${xhr.status}`));
      };
      xhr.onerror = () => finish(reject, new Error("Network upload failed"));
      xhr.ontimeout = () => finish(reject, new Error("Upload timed out"));
      xhr.onabort = () => finish(reject, new Error("Upload aborted"));
      xhr.send(file);
    });
  } catch (error) {
    console.warn("XHR upload failed, retrying with Supabase client", error);
    return uploadWithSupabaseClient({ file, path, onProgress });
  }
};

export const queueMemoryDraft = async ({ userId, profileId, date, note, photos, coverIndex, coverPosition }) => {
  const id = `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await putQueuedMemory({ id, userId, profileId, date, note, photos, coverIndex, coverPosition });
  return id;
};

export const uploadMemoryPayload = async ({ userId, profileId, date, note, photos, coverIndex, coverPosition, onStatus = () => {}, onProgress = () => {} }) => {
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
