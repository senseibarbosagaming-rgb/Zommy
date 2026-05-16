import { useEffect, useMemo, useRef, useState } from "react";
import { field, palette, type } from "./designSystem";
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
  const [draftSuppressed, setDraftSuppressed] = useState(false);
  const photosRef = useRef([]);

  const copy = useMemo(getComposerCopy, []);
  const activeProfile = profiles.find((profile) => profile.id === profileId);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    const openComposer = async (event) => {
      const { profileId: requestedProfileId, restoreDraft = true } = event.detail || {};
      const { user: nextUser, profiles: nextProfiles, draft } = await loadComposerContext();
      setUser(nextUser);
      if (!nextUser) return;

      const draftToRestore = restoreDraft ? draft : null;
      revokePhotoPreviews(photosRef.current);
      const nextPhotos = photosFromDraft(draftToRestore);
      setProfiles(nextProfiles);
      setProfileId(draftToRestore?.profileId || requestedProfileId || (nextProfiles.length === 1 ? nextProfiles[0].id : ""));
      setDate(draftToRestore?.date || today());
      setNote(draftToRestore?.note || "");
      setPhotos(nextPhotos);
      setCoverIndex(draftToRestore?.coverIndex || 0);
      setCoverPosition(draftToRestore?.coverPosition || "50% 50%");
      setStatus(draftToRestore ? copy.draftRestored : "");
      setProgress(0);
      setFailed(false);
      setSaving(false);
      setDraftSuppressed(false);
      setOpen(true);
    };

    window.addEventListener("zommy:open-memory-composer", openComposer);
    return () => window.removeEventListener("zommy:open-memory-composer", openComposer);
  }, [copy.draftRestored]);

  useEffect(() => {
    if (!open || saving || draftSuppressed) return undefined;
    const timeout = window.setTimeout(() => {
      persistComposerDraft({ profileId, date, note, photos, coverIndex, coverPosition }).catch(() => null);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [coverIndex, coverPosition, date, draftSuppressed, note, open, photos, profileId, saving]);

  useEffect(() => () => revokePhotoPreviews(photosRef.current), []);

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

    setDraftSuppressed(false);
    setPhotos((current) => [...current, ...files.map(photoFromFile)]);
    setFailed(false);
    setStatus("");
    event.target.value = "";
  };

  const removePhoto = (id) => {
    setDraftSuppressed(false);
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      revokePhotoPreviews(removed ? [removed] : []);
      const next = current.filter((photo) => photo.id !== id);
      if (coverIndex >= next.length) setCoverIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const finishAndClose = (delay = 650) => {
    window.dispatchEvent(new CustomEvent("zommy:draft-cleared"));
    window.setTimeout(() => {
      revokePhotoPreviews(photos);
      setPhotos([]);
      setOpen(false);
    }, delay);
  };

  const queueOffline = async () => {
    setDraftSuppressed(true);
    await queueCurrentMemory({ user, activeProfile, date, note, photos, coverIndex, coverPosition });
    await clearDraft().catch(() => null);
    setStatus(copy.queued);
    setProgress(100);
    window.dispatchEvent(new CustomEvent("zommy:queue-updated"));
    window.dispatchEvent(new CustomEvent("zommy:memories-synced"));
    finishAndClose(700);
  };

  const afterSaved = async () => {
    setDraftSuppressed(true);
    await clearDraft().catch(() => null);
    setStatus(copy.done);
    setProgress(100);
    window.dispatchEvent(new CustomEvent("zommy:memories-synced"));
    window.dispatchEvent(new CustomEvent("zommy:memory-saved", { detail: { profileId: activeProfile?.id, date } }));
    window.dispatchEvent(new CustomEvent("zommy:show-today"));
    finishAndClose(650);
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
        setDraftSuppressed(false);
        setStatus(copy.genericError);
        setFailed(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadButtonStyle = { border: `1px dashed ${palette.borderStrong}`, background: "rgba(255,253,248,0.70)", color: palette.inkMuted, borderRadius: 15, padding: "14px 15px", textAlign: "center", fontWeight: 800, cursor: saving ? "wait" : "pointer" };
  const cameraButtonStyle = { border: "1px solid rgba(91,67,48,0.14)", background: "rgba(255,253,248,0.58)", color: palette.inkFaint, borderRadius: 14, padding: "12px 14px", textAlign: "center", fontWeight: 800, fontSize: 13, cursor: saving ? "wait" : "pointer" };

  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(46,41,35,0.36)", color: palette.ink, fontFamily: type.sans, overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100dvh", height: "var(--z-viewport-height, 100dvh)", margin: "0 auto", display: "flex", flexDirection: "column", background: palette.paper }}>
        <header style={{ flex: "0 0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "calc(14px + env(safe-area-inset-top, 0px)) 18px 13px", borderBottom: `1px solid ${palette.border}`, background: "rgba(255,253,248,0.94)", backdropFilter: "blur(14px)" }}>
          <h1 style={{ fontFamily: type.serif, fontSize: 24, lineHeight: 1.16, fontWeight: 650 }}>
            {activeProfile ? copy.title(activeProfile.name) : copy.chooseChild}
          </h1>
          <button onClick={close} disabled={saving} style={{ border: `1px solid ${palette.border}`, background: palette.paperSoft, color: palette.inkMuted, borderRadius: 999, padding: "8px 12px", fontSize: 13, cursor: saving ? "wait" : "pointer" }}>{copy.cancel}</button>
        </header>

        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 18px calc(104px + env(safe-area-inset-bottom, 0px) + var(--z-keyboard-inset, 0px))", WebkitOverflowScrolling: "touch" }}>
          {profiles.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
              {profiles.map((profile) => (
                <button key={profile.id} onClick={() => { setDraftSuppressed(false); setProfileId(profile.id); }} disabled={saving} style={{ flexShrink: 0, border: `1px solid ${profileId === profile.id ? profile.color : "rgba(91,67,48,0.14)"}`, background: profileId === profile.id ? `${profile.color}22` : "rgba(255,253,248,0.70)", color: profileId === profile.id ? profile.color : palette.inkMuted, borderRadius: 999, padding: "8px 13px", fontSize: 13, fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
                  {profile.emoji || "👶"} {profile.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gap: 15 }}>
            <label style={labelStyle()}>
              {copy.date}
              <input type="date" value={date} max={today()} disabled={saving} onChange={(event) => { setDraftSuppressed(false); setDate(event.target.value); }} style={fieldStyle()} />
            </label>

            <section style={{ display: "grid", gap: 8 }}>
              <div style={labelTextStyle()}>{copy.photos}</div>
              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                  {photos.map((photo, index) => (
                    <button key={photo.id} type="button" onClick={() => { setDraftSuppressed(false); setCoverIndex(index); }} disabled={saving} style={{ border: `2px solid ${coverIndex === index ? activeProfile?.color || "#17d86f" : "transparent"}`, background: "rgba(255,253,248,0.70)", borderRadius: 13, overflow: "hidden", padding: 0, position: "relative", aspectRatio: "9 / 13", cursor: saving ? "wait" : "pointer" }}>
                      <img src={photo.preview} alt="Selected memory preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: coverIndex === index ? coverPosition : "50% 50%", display: "block" }} />
                      <span style={{ position: "absolute", left: 6, top: 6, background: "rgba(0,0,0,0.55)", color: palette.paper, borderRadius: 999, padding: "3px 7px", fontSize: 10, fontWeight: 900 }}>{index === coverIndex ? copy.cover : index + 1}</span>
                      {!saving && <span onClick={(event) => { event.stopPropagation(); removePhoto(photo.id); }} style={{ position: "absolute", right: 6, top: 6, background: "rgba(0,0,0,0.6)", color: palette.paper, borderRadius: 999, width: 24, height: 24, display: "grid", placeItems: "center", fontSize: 14 }}>×</span>}
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
              <section style={{ border: `1px solid ${palette.border}`, borderRadius: 16, padding: 12, background: "rgba(255,253,248,0.56)" }}>
                <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 4 }}>{copy.coverCrop}</div>
                <div style={{ fontSize: 12, color: palette.inkFaint, marginBottom: 10 }}>{copy.cropHint}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
                  {cropOptions.map((option) => (
                    <button key={option.id} type="button" disabled={saving} onClick={() => { setDraftSuppressed(false); setCoverPosition(option.value); }} style={{ border: `1px solid ${coverPosition === option.value ? activeProfile?.color || "#17d86f" : "rgba(91,67,48,0.14)"}`, background: coverPosition === option.value ? `${activeProfile?.color || "#17d86f"}22` : "transparent", color: coverPosition === option.value ? activeProfile?.color || "#17d86f" : palette.inkMuted, borderRadius: 12, padding: "9px 8px", fontSize: 12, fontWeight: 850, cursor: saving ? "wait" : "pointer" }}>
                      {copy[option.id]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <label style={labelStyle()}>
              {copy.note}
              <textarea value={note} disabled={saving} onChange={(event) => { setDraftSuppressed(false); setNote(event.target.value); }} placeholder={copy.notePlaceholder} rows={5} style={{ ...fieldStyle(), resize: "vertical", lineHeight: 1.55 }} />
            </label>

            {(status || saving) && (
              <div style={{ display: "grid", gap: 7 }}>
                <div style={{ color: failed ? "#FB7185" : palette.inkMuted, fontSize: 13, fontWeight: 750 }}>{status}</div>
                <div style={{ height: 7, borderRadius: 999, background: "rgba(91,67,48,0.10)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: failed ? "#FB7185" : activeProfile?.color || "#17d86f", transition: "width 0.2s ease" }} />
                </div>
              </div>
            )}

            <div style={{ position: "sticky", bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", zIndex: 2, marginTop: 4, paddingTop: 8, background: "linear-gradient(180deg, rgba(255,253,248,0), #FFFDF8 35%)" }}>
              <button type="button" onClick={saveMemory} disabled={saving} style={{ width: "100%", border: "none", background: activeProfile?.color || "#17d86f", color: palette.paper, borderRadius: 16, padding: "16px 18px", fontSize: 16, fontWeight: 900, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.75 : 1, boxShadow: palette.shadowSoft }}>
                {failed ? copy.retry : copy.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const labelTextStyle = () => ({ color: palette.inkMuted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" });
const labelStyle = () => ({ display: "grid", gap: 7, ...labelTextStyle() });
const fieldStyle = () => field;
