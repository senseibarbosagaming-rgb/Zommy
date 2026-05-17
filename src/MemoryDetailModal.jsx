import { useMemo, useState } from "react";
import { appSurface, field, palette, type } from "./designSystem";
import { supabase } from "./supabase";

const COPY = {
  en: {
    close: "Close",
    edit: "Edit",
    share: "Share",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving...",
    deleting: "Deleting...",
    favorite: "Favorite",
    removeFavorite: "Remove favorite",
    note: "Note",
    date: "Date",
    noteEmpty: "No note",
    deleteTitle: "Delete this memory?",
    deleteBody: (name, date) => `This will permanently delete ${name ? `${name}'s ` : "this "}memory${date ? ` from ${date}` : ""}. This cannot be undone.`,
    deleteConfirm: "Delete memory",
    shareText: (name, date, note) => `${name ? `${name} · ` : ""}${date}${note ? `\n\n${note}` : ""}`,
    copied: "Memory text copied.",
    photoCopied: "Photo link copied.",
    failed: "Something went wrong. Try again.",
  },
  pt: {
    close: "Fechar",
    edit: "Editar",
    share: "Partilhar",
    delete: "Eliminar",
    cancel: "Cancelar",
    save: "Guardar alterações",
    saving: "A guardar...",
    deleting: "A eliminar...",
    favorite: "Favorita",
    removeFavorite: "Remover favorita",
    note: "Nota",
    date: "Data",
    noteEmpty: "Sem nota",
    deleteTitle: "Eliminar esta memória?",
    deleteBody: (name, date) => `Isto vai eliminar permanentemente ${name ? `a memória de ${name}` : "esta memória"}${date ? ` de ${date}` : ""}. Não é possível desfazer.`,
    deleteConfirm: "Eliminar memória",
    shareText: (name, date, note) => `${name ? `${name} · ` : ""}${date}${note ? `\n\n${note}` : ""}`,
    copied: "Texto da memória copiado.",
    photoCopied: "Link da foto copiado.",
    failed: "Algo correu mal. Tenta de novo.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const formatDate = (date, lang) => new Date(`${date}T12:00:00`).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const diffDays = (from, to) => {
  if (!from || !to) return null;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.floor((end - start) / 86400000);
};

const ageAtMemory = (profile, entryDate, lang) => {
  if (!profile?.birthdate) return "";
  const days = diffDays(profile.birthdate, entryDate);
  if (days == null || days < 0) return "";
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);
  const remainderMonths = months % 12;

  if (lang === "pt") {
    if (years <= 0) return `${months} mes${months === 1 ? "" : "es"}`;
    return `${years} ano${years === 1 ? "" : "s"}${remainderMonths ? ` e ${remainderMonths} mes${remainderMonths === 1 ? "" : "es"}` : ""}`;
  }

  if (years <= 0) return `${months} month${months === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"}${remainderMonths ? `, ${remainderMonths} month${remainderMonths === 1 ? "" : "s"}` : ""}`;
};

const storagePathsFor = (entry) => {
  const paths = new Set();
  [entry.cover_photo_path, entry.photo_path, entry.photo].forEach((value) => {
    if (value && !/^https?:\/\//i.test(value) && !/^data:/i.test(value)) paths.add(value);
  });
  (entry.photos || []).forEach((photo) => {
    const value = photo?.path || photo?.photo_path || photo?.url;
    if (value && !/^https?:\/\//i.test(value) && !/^data:/i.test(value)) paths.add(value);
  });
  return [...paths];
};

const shareFileFromUrl = async ({ url, title, text }) => {
  if (!url || !navigator.share) return false;

  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const blob = await response.blob();
    const extension = blob.type?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const file = new File([blob], `zommy-memory.${extension}`, { type: blob.type || "image/jpeg" });
    const shareData = { title, text, files: [file] };

    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      return true;
    }
  } catch (error) {
    console.warn("Photo share failed", error);
  }

  return false;
};

export default function MemoryDetailModal({ entry, profile, user, lang = "en", onClose, onChanged }) {
  const copy = useMemo(getCopy, []);
  const [mode, setMode] = useState("view");
  const [note, setNote] = useState(entry.note || "");
  const [date, setDate] = useState(entry.date || "");
  const [favorite, setFavorite] = useState(Boolean(entry.favorite));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const galleryPhotos = useMemo(() => {
    const signedPhotos = Array.isArray(entry.photosWithUrls) ? entry.photosWithUrls : [];
    if (signedPhotos.length) return signedPhotos;
    return entry.photoUrl ? [{ path: entry.cover_photo_path || entry.photo_path || entry.photo || "", url: entry.photoUrl, position: entry.cover_position || "50% 50%" }] : [];
  }, [entry]);
  const selectedPhoto = galleryPhotos[selectedPhotoIndex] || galleryPhotos[0] || null;

  const displayDate = date ? formatDate(date, lang) : "";
  const displayAge = ageAtMemory(profile, date, lang);
  const profileColor = profile?.color || palette.accent;

  const refreshParent = async () => {
    await onChanged?.();
  };

  const saveChanges = async () => {
    if (!user?.id || !entry?.id) return;
    setBusy(true);
    setMessage(copy.saving);

    const { error } = await supabase
      .from("entries")
      .update({ note, date, favorite })
      .eq("id", entry.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(copy.failed);
      setBusy(false);
      return;
    }

    setMode("view");
    setMessage("");
    setBusy(false);
    await refreshParent();
  };

  const toggleFavorite = async () => {
    if (!user?.id || !entry?.id) return;
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    const { error } = await supabase.from("entries").update({ favorite: nextFavorite }).eq("id", entry.id).eq("user_id", user.id);
    if (error) {
      setFavorite(!nextFavorite);
      setMessage(copy.failed);
      return;
    }
    await refreshParent();
  };

  const shareMemory = async () => {
    const text = copy.shareText(profile?.name || "", displayDate, note);
    const photoUrl = selectedPhoto?.url || entry.photoUrl;

    try {
      if (await shareFileFromUrl({ url: photoUrl, title: "Zommy memory", text })) return;

      if (navigator.share && photoUrl) {
        await navigator.share({ title: "Zommy memory", url: photoUrl });
      } else if (photoUrl) {
        await navigator.clipboard.writeText(photoUrl);
        setMessage(copy.photoCopied);
        window.setTimeout(() => setMessage(""), 1800);
      } else if (navigator.share) {
        await navigator.share({ title: "Zommy memory", text });
      } else {
        await navigator.clipboard.writeText(text);
        setMessage(copy.copied);
        window.setTimeout(() => setMessage(""), 1800);
      }
    } catch {
      setMessage(copy.failed);
    }
  };

  const deleteMemory = async () => {
    if (!user?.id || !entry?.id || busy) return;
    setBusy(true);
    setMessage(copy.deleting);

    const paths = storagePathsFor(entry);
    const { error } = await supabase.from("entries").delete().eq("id", entry.id).eq("user_id", user.id);
    if (error) {
      setMessage(copy.failed);
      setBusy(false);
      return;
    }

    await refreshParent();
    onClose?.();

    if (paths.length) {
      supabase.storage.from("photos").remove(paths).catch(() => null);
    }
  };

  return (
    <main className="zommy-primary-screen" style={{ ...appSurface, zIndex: 1800 }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", display: "grid", alignContent: "start", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <header style={headerStyle}>
          <button onClick={onClose} aria-label={copy.close} disabled={busy} style={backButton()}>←</button>
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <div style={{ color: profileColor, fontSize: 11, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</div>
            <div style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{displayDate}</div>
          </div>
          <button onClick={shareMemory} aria-label={copy.share} disabled={busy} style={backButton()}>↗</button>
        </header>

        {selectedPhoto?.url ? (
          <section style={{ background: palette.stone }}>
            <img src={selectedPhoto.url} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", maxHeight: "62dvh", objectFit: "cover", objectPosition: selectedPhoto.position || entry.cover_position || "50% 50%", display: "block" }} />
          </section>
        ) : (
          <section style={{ minHeight: 280, display: "grid", placeItems: "center", background: profile?.bg || palette.accentSoft, color: profileColor, fontSize: 42 }}>{profile?.emoji || "○"}</section>
        )}

        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          <div>
            <h1 id="zommy-memory-detail-title" style={titleStyle}>{displayDate}</h1>
            {displayAge && <p style={{ color: palette.muted, fontSize: 13, marginTop: 5 }}>{displayAge}</p>}
          </div>

          {mode === "edit" ? (
            <section style={{ display: "grid", gap: 12 }}>
              <label style={fieldLabel()}>
                {copy.date}
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} style={inputStyle()} />
              </label>
              <label style={fieldLabel()}>
                {copy.note}
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} disabled={busy} style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.55 }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <button onClick={() => { setMode("view"); setNote(entry.note || ""); setDate(entry.date || ""); setFavorite(Boolean(entry.favorite)); }} disabled={busy} style={secondaryButton()}>{copy.cancel}</button>
                <button onClick={saveChanges} disabled={busy} style={primaryButton()}>{copy.save}</button>
              </div>
            </section>
          ) : mode === "confirmDelete" ? (
            <section style={dangerPanelStyle}>
              <h2 style={dangerTitleStyle}>{copy.deleteTitle}</h2>
              <p style={{ color: palette.faint, fontSize: 14, lineHeight: 1.6 }}>{copy.deleteBody(profile?.name || "", displayDate)}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <button onClick={() => setMode("view")} disabled={busy} style={secondaryButton()}>{copy.cancel}</button>
                <button onClick={deleteMemory} disabled={busy} style={dangerButton()}>{copy.deleteConfirm}</button>
              </div>
            </section>
          ) : (
            <>
              {galleryPhotos.length > 1 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {galleryPhotos.map((photo, index) => (
                    <button key={photo.path || photo.url || index} type="button" onClick={() => setSelectedPhotoIndex(index)} disabled={busy} aria-label={`Show photo ${index + 1}`} className="zommy-elevated-card" style={{ flex: "0 0 68px", border: `2px solid ${index === selectedPhotoIndex ? profileColor : "transparent"}`, borderRadius: 15, overflow: "hidden", padding: 0, background: palette.surface, aspectRatio: "1", cursor: busy ? "wait" : "pointer", boxShadow: palette.shadow }}>
                      <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: photo.position || "50% 50%", display: "block" }} />
                    </button>
                  ))}
                </div>
              )}
              <section style={noteCardStyle}>
                <p style={{ color: note ? palette.stone : palette.muted, lineHeight: 1.65, fontSize: 15 }}>{note || copy.noteEmpty}</p>
              </section>
              <button className="zommy-elevated-card" onClick={toggleFavorite} disabled={busy} style={favoriteButtonStyle(favorite)}>
                {favorite ? "★ " + copy.removeFavorite : "☆ " + copy.favorite}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button className="zommy-elevated-card" onClick={() => setMode("edit")} disabled={busy} style={secondaryButton()}>{copy.edit}</button>
                <button className="zommy-elevated-card" onClick={shareMemory} disabled={busy} style={secondaryButton()}>{copy.share}</button>
                <button className="zommy-elevated-card" onClick={() => setMode("confirmDelete")} disabled={busy} style={dangerGhostButton()}>{copy.delete}</button>
              </div>
            </>
          )}

          {message && <div role="status" style={{ color: message === copy.failed ? palette.danger : palette.muted, fontSize: 13, fontWeight: type.weight.ui }}>{message}</div>}
        </div>
      </div>
    </main>
  );
}

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 3,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "calc(10px + env(safe-area-inset-top, 0px)) 20px 10px",
  background: palette.overlaySoft,
  backdropFilter: "blur(18px)",
  borderBottom: `1px solid ${palette.line}`,
};

const titleStyle = { fontFamily: type.serif, fontSize: 30, lineHeight: 1.08, fontWeight: type.weight.heading, letterSpacing: 0 };
const dangerTitleStyle = { fontFamily: type.serif, fontSize: 24, lineHeight: 1.18, fontWeight: type.weight.heading };
const noteCardStyle = { border: "none", background: palette.surface, borderRadius: 20, padding: 16, boxShadow: palette.shadow };
const dangerPanelStyle = { border: "none", background: palette.surface, borderRadius: 20, padding: 16, display: "grid", gap: 12, boxShadow: palette.shadow };

function backButton() {
  return { border: `1px solid ${palette.line}`, background: palette.surface, color: palette.stone, borderRadius: 999, minWidth: 48, minHeight: 48, cursor: "pointer", fontSize: 18, fontWeight: type.weight.ui };
}

function fieldLabel() {
  return { display: "grid", gap: 7, color: palette.muted, fontSize: 11, fontWeight: type.weight.ui, textTransform: "uppercase", letterSpacing: 0 };
}

function inputStyle() {
  return { ...field, fontSize: 16 };
}

function secondaryButton() {
  return { border: `1px solid ${palette.line}`, background: palette.surface, color: palette.stone, borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: type.weight.ui, cursor: "pointer" };
}

function primaryButton() {
  return { border: "none", background: palette.accent, color: palette.surface, borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: type.weight.heading, cursor: "pointer" };
}

function dangerButton() {
  return { border: "none", background: palette.danger, color: palette.surface, borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: type.weight.heading, cursor: "pointer" };
}

function dangerGhostButton() {
  return { border: `1px solid ${palette.dangerSoft}`, background: palette.dangerSoft, color: palette.danger, borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: type.weight.ui, cursor: "pointer" };
}

function favoriteButtonStyle(favorite) {
  return { border: `1px solid ${favorite ? palette.warningSoft : palette.line}`, background: favorite ? palette.warningSoft : palette.surface, color: favorite ? palette.warning : palette.stone, borderRadius: 16, minHeight: 50, fontSize: 14, fontWeight: type.weight.ui, cursor: "pointer", boxShadow: palette.shadow };
}
