import { useEffect, useMemo, useState } from "react";
import { clearDraft } from "./pwaStorage";
import { uploadMemoryPayload } from "./pwaUploadQueue";
import {
  cropOptions,
  getComposerCopy,
  loadComposerContext,
  persistComposerDraft,
  photoFromFile,
  photosFromDraft,
  queueCurrentMemory,
  revokePhotoPreviews,
  statusTextForUpload,
  today,
  validateComposer,
} from "./memoryComposerCore";

export default function MemoryComposer() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [user, setUser] = useState(null);
  const [profileId, setProfileId] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverPosition, setCoverPosition] = useState("50% 50%");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = useMemo(getComposerCopy, []);
  const activeProfile = profiles.find((profile) => profile.id === profileId);

  useEffect(() => {
    const openComposer = async (event) => {
      const { profileId: requestedProfileId } = event.detail || {};
      const { user: nextUser, profiles: nextProfiles, draft } = await loadComposerContext();
      setUser(nextUser);
      if (!nextUser) return;

      revokePhotoPreviews(photos);
      const nextPhotos = photosFromDraft(draft);
      setProfiles(nextProfiles);
      setProfileId(requestedProfileId || draft?.profileId || (nextProfiles.length === 1 ? nextProfiles[0].id : ""));
      setDate(draft?.date || today());
      setNote(draft?.note || "");
      setPhotos(nextPhotos);
      setCoverIndex(draft?.coverIndex || 0);
      setCoverPosition(draft?.coverPosition || "50% 50%");
      setStatus(draft ? copy.draftRestored : "");
      setProgress(0);
      setFailed(false);
      setSaving(false);
      setOpen(true);
    };

    window.addEventListener("zommy:open-memory-composer", openComposer);
    return () => window.removeEventListener("zommy:open-memory-composer", openComposer);
  }, [copy.draftRestored, photos]);

  useEffect(() => {
    if (!open || saving) return undefined;
    const timeout = window.setTimeout(() => {
      persistComposerDraft({ profileId, date, note, photos, coverIndex, coverPosition }).catch(() => null);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [coverIndex, coverPosition, date, note, open, photos, profileId, saving]);

  useEffect(() => () => revokePhotoPreviews(photos), [photos]);

  if (!open) return null;

  const close = () => {
    if (saving) return;
    revokePhotoPreviews(photos);
    setPhotos([]);
    setOpen(false);
  };

  const onChooseFiles = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    setPhotos((current) => [...current, ...files.map(photoFromFile)]);
    setFailed(false);
    setStatus("");
    event.target.value = "";
  };

  const removePhoto = (id) => {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      revokePhotoPreviews(removed ? [removed] : []);
      const next = current.filter((photo) => photo.id !== id);
      if (coverIndex >= next.length) setCoverIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const queueOffline = async () => {
    await queueCurrentMemory({ user, activeProfile, date, note, photos, coverIndex, coverPosition });
    setStatus(copy.queued);
    setProgress(100);
    window.setTimeout(() => {
      revokePhotoPreviews(photos);
      setPhotos([]);
      setOpen(false);
    }, 700);
  };

  const afterSaved = async () => {
    await clearDraft().catch(() => null);
    setStatus(copy.done);
    setProgress(100);
    window.dispatchEvent(new CustomEvent("zommy:memories-synced"));
    window.dispatchEvent(new CustomEvent("zommy:show-today"));
    window.setTimeout(() => {
      revokePhotoPreviews(photos);
      setPhotos([]);
      setOpen(false);
    }, 650);
  };

  const saveMemory = async () => {
    setFailed(false);
    setProgress(0);

    const validationError = validateComposer({ user, activeProfile, photos, copy });
    if (validationError) {
      setStatus(validationError);
      setFailed(true);
      return;
    }

    setSaving(true);
    try {
      if (!navigator.onLine) {
        await queueOffline();
        setSaving(false);
        return;
      }

      await uploadMemoryPayload({
        userId: user.id,
        profileId: activeProfile.id,
        date,
        note,
        photos,
        coverIndex,
        coverPosition,
        onProgress: setProgress,
        onStatus: (nextStatus) => setStatus(statusTextForUpload(copy, nextStatus)),
      });

      await afterSaved();
    } catch (error) {
      console.error("Failed to save memory", error);
      if (!navigator.onLine) {
        await queueOffline().catch(() => null);
      } else {
        setStatus(copy.genericError);
        setFailed(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadButtonStyle = { border: "1px dashed rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.72)", borderRadius: 15, padding: "14px 15px", textAlign: "center", fontWeight: 800, cursor: saving ? "wait" : "pointer" };
  const cameraButtonStyle = { border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.64)", borderRadius: 14, padding: "12px 14px", textAlign: "center", fontWeight: 800, fontSize: 13, cursor: saving ? "wait" : "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto", background: "#101418", color: "#fff", borderRadius: "26px 26px 0 0", padding: "20px 18px calc(22px + env(safe-area-inset-bottom, 0px))", fontFamily: "Inter, system-ui, sans-serif", boxShadow: "0 -26px 100px rgba(0,0,0,0.5)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 25, lineHeight: 1.16, fontWeight: 650 }}>
            {activeProfile ? copy.title(activeProfile.name) : copy.chooseChild}
          </h1>
          <button onClick={close} disabled={saving} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.68)", borderRadius: 999, padding: "8px 12px", fontSize: 13, cursor: saving ? "wait" : "pointer" }}>{copy.cancel}</button>
        </header>

        {profiles.length > 1 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
            {profiles.map((profile) => (
              <button key={profile.id} onClick={() => setProfileId(profile.id)} disabled={saving} style={{ flexShrink: 0, border: `1px solid ${profileId === profile.id ? profile.color : "rgba(255,255,255,0.13)"}`, background: profileId === profile.id ? `${profile.color}22` : "rgba(255,255,255,0.05)", color: profileId === profile.id ? profile.color : "rgba(255,255,255,0.72)", borderRadius: 999, padding: "8px 13px", fontSize: 13, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
                {profile.emoji || "👶"} {profile.name}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gap: 15 }}>
          <label style={labelStyle()}>
            {copy.date}
            <input type="date" value={date} max={today()} disabled={saving} onChange={(event) => setDate(event.target.value)} style={fieldStyle()} />
          </label>

          <section style={{ display: "grid", gap: 8 }}>
            <div style={labelTextStyle()}>{copy.photos}</div>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                {photos.map((photo, index) => (
                  <button key={photo.id} type="button" onClick={() => setCoverIndex(index)} disabled={saving} style={{ border: `2px solid ${coverIndex === index ? activeProfile?.color || "#17d86f" : "transparent"}`, background: "rgba(255,255,255,0.05)", borderRadius: 13, overflow: "hidden", padding: 0, position: "relative", aspectRatio: "9 / 13", cursor: saving ? "wait" : "pointer" }}>
                    <img src={photo.preview} alt="Selected memory preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: coverIndex === index ? coverPosition : "50% 50%", display: "block" }} />
                    <span style={{ position: "absolute", left: 6, top: 6, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 999, padding: "3px 7px", fontSize: 10, fontWeight: 900 }}>{index === coverIndex ? copy.cover : index + 1}</span>
                    {!saving && <span onClick={(event) => { event.stopPropagation(); removePhoto(photo.id); }} style={{ position: "absolute", right: 6, top: 6, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 999, width: 24, height: 24, display: "grid", placeItems: "center", fontSize: 14 }}>×</span>}
                  </button>
                ))}
              </div>
            )}
            <label style={uploadButtonStyle}>
              🖼️ {copy.addPhotos}
              <input type="file" accept="image/*" multiple disabled={saving} onChange={onChooseFiles} style={{ display: "none" }} />
            </label>
            <label style={cameraButtonStyle}>
              📷 {copy.takePhoto}
              <input type="file" accept="image/*" capture="environment" disabled={saving} onChange={onChooseFiles} style={{ display: "none" }} />
            </label>
          </section>

          {photos.length > 0 && (
            <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 4 }}>{copy.coverCrop}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginBottom: 10 }}>{copy.cropHint}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                {cropOptions.map((option) => (
                  <button key={option.id} type="button" disabled={saving} onClick={() => setCoverPosition(option.value)} style={{ border: `1px solid ${coverPosition === option.value ? activeProfile?.color || "#17d86f" : "rgba(255,255,255,0.13)"}`, background: coverPosition === option.value ? `${activeProfile?.color || "#17d86f"}22` : "transparent", color: coverPosition === option.value ? activeProfile?.color || "#17d86f" : "rgba(255,255,255,0.68)", borderRadius: 12, padding: "9px 8px", fontSize: 12, fontWeight: 850, cursor: saving ? "wait" : "pointer" }}>
                    {copy[option.id]}
                  </button>
                ))}
              </div>
            </section>
          )}

          <label style={labelStyle()}>
            {copy.note}
            <textarea value={note} disabled={saving} onChange={(event) => setNote(event.target.value)} placeholder={copy.notePlaceholder} rows={3} style={{ ...fieldStyle(), resize: "none", lineHeight: 1.55 }} />
          </label>

          {(status || saving) && (
            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ color: failed ? "#FB7185" : "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 750 }}>{status}</div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: failed ? "#FB7185" : activeProfile?.color || "#17d86f", transition: "width 0.2s ease" }} />
              </div>
            </div>
          )}

          <button type="button" onClick={saveMemory} disabled={saving} style={{ width: "100%", border: "none", background: activeProfile?.color || "#17d86f", color: "#fff", borderRadius: 16, padding: "16px 18px", fontSize: 16, fontWeight: 900, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.75 : 1 }}>
            {failed ? copy.retry : copy.save}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelTextStyle = () => ({ color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" });
const labelStyle = () => ({ display: "grid", gap: 7, ...labelTextStyle() });
const fieldStyle = () => ({ width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 13, padding: "12px 13px", font: "inherit", fontSize: 15 });
