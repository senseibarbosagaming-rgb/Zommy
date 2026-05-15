import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";
import { deleteQueuedMemory, getQueuedMemories, putQueuedMemory } from "./pwaStorage";

const readFileAsImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
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

export const compressImageForUpload = async (file) => {
  const image = await readFileAsImage(file);
  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 0.78);

  if (blob.size >= file.size && file.size < 2_000_000) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
};

const getSessionToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || SUPABASE_ANON_KEY;
};

export const uploadWithProgress = async ({ file, path, onProgress = () => {} }) => {
  const token = await getSessionToken();
  const endpoint = `${SUPABASE_URL}/storage/v1/object/photos/${encodeURIComponent(path).replace(/%2F/g, "/")}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(path);
      else reject(new Error(xhr.responseText || `Upload failed with ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network upload failed"));
    xhr.send(file);
  });
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
    const path = `${userId}/${Date.now()}-${i}.jpg`;
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
