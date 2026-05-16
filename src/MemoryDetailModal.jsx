import { useMemo, useState } from "react";
import { supabase } from "./supabase";

const COPY = {
  en: {
    close: "Close",
    edit: "Edit",
    share: "Share",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    deleting: "Deleting…",
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
    failed: "Something went wrong. Try again.",
  },
  pt: {
    close: "Fechar",
    edit: "Editar",
    share: "Partilhar",
    delete: "Eliminar",
    cancel: "Cancelar",
    save: "Guardar alterações",
    saving: "A guardar…",
    deleting: "A eliminar…",
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

export default function MemoryDetailModal({ entry, profile, user, lang = "en", onClose, onChanged }) {
  const copy = useMemo(getCopy, []);
  const [mode, setMode] = useState("view");
  const [note, setNote] = useState(entry.note || "");
  const [date, setDate] = useState(entry.date || "");
  const [favorite, setFavorite] = useState(Boolean(entry.favorite));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const displayDate = date ? formatDate(date, lang) : "";
  const displayAge = ageAtMemory(profile, date, lang);

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
    try {
      if (navigator.share) {
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1800, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <article role="dialog" aria-modal="true" aria-labelledby="zommy-memory-detail-title" style={{ width: "100%", maxWidth: 452, maxHeight: "92dvh", overflowY: "auto", background: "#111820", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, boxShadow: "0 24px 90px rgba(0,0,0,0.55)", fontFamily: "Inter, system-ui, sans-serif" }} onClick={(event) => event.stopPropagation()}>
        {entry.photoUrl && <img src={entry.photoUrl} alt={`${profile?.name || "Child"} memory`} style={{ width: "100%", maxHeight: 430, objectFit: "cover", objectPosition: entry.cover_position || "50% 50%", display: "block" }} />}

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ color: profile?.color || "#34D399", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.7px" }}>{profile?.emoji || "👶"} {profile?.name || "Memory"}</div>
              <h2 id="zommy-memory-detail-title" style={{ fontFamily: "Lora, Georgia, serif", fontSize: 24, lineHeight: 1.15, marginTop: 4 }}>{displayDate}</h2>
              {displayAge && <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 }}>{displayAge}</p>}
            </div>
            <button onClick={onClose} aria-label={copy.close} disabled={busy} style={iconButton()}>×</button>
          </div>

          {mode === "edit" ? (
            <section style={{ display: "grid", gap: 10 }}>
              <label style={fieldLabel()}>
                {copy.date}
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} style={inputStyle()} />
              </label>
              <label style={fieldLabel()}>
                {copy.note}
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} disabled={busy} style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.55 }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <button onClick={() => { setMode("view"); setNote(entry.note || ""); setDate(entry.date || ""); setFavorite(Boolean(entry.favorite)); }} disabled={busy} style={secondaryButton()}>{copy.cancel}</button>
                <button onClick={saveChanges} disabled={busy} style={primaryButton(profile?.color || "#34D399")}>{copy.save}</button>
              </div>
            </section>
          ) : mode === "confirmDelete" ? (
            <section style={{ border: "1px solid rgba(248,113,113,0.34)", background: "rgba(248,113,113,0.1)", borderRadius: 18, padding: 14, display: "grid", gap: 12 }}>
              <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 22, lineHeight: 1.18 }}>{copy.deleteTitle}</h3>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.6 }}>{copy.deleteBody(profile?.name || "", displayDate)}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <button onClick={() => setMode("view")} disabled={busy} style={secondaryButton()}>{copy.cancel}</button>
                <button onClick={deleteMemory} disabled={busy} style={dangerButton()}>{copy.deleteConfirm}</button>
              </div>
            </section>
          ) : (
            <>
              <p style={{ color: note ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.42)", lineHeight: 1.6, fontSize: 15 }}>{note || copy.noteEmpty}</p>
              <button onClick={toggleFavorite} disabled={busy} style={{ border: `1px solid ${favorite ? "#FBBF24" : "rgba(255,255,255,0.14)"}`, background: favorite ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.05)", color: favorite ? "#FBBF24" : "#fff", borderRadius: 15, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: busy ? "wait" : "pointer" }}>
                {favorite ? "★ " + copy.removeFavorite : "☆ " + copy.favorite}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button onClick={() => setMode("edit")} disabled={busy} style={secondaryButton()}>{copy.edit}</button>
                <button onClick={shareMemory} disabled={busy} style={secondaryButton()}>{copy.share}</button>
                <button onClick={() => setMode("confirmDelete")} disabled={busy} style={dangerGhostButton()}>{copy.delete}</button>
              </div>
            </>
          )}

          {message && <div role="status" style={{ color: message === copy.failed ? "#fca5a5" : "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: 800 }}>{message}</div>}
        </div>
      </article>
    </div>
  );
}

function iconButton() {
  return { border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: 999, minWidth: 44, minHeight: 44, cursor: "pointer", fontSize: 20 };
}

function fieldLabel() {
  return { display: "grid", gap: 7, color: "rgba(255,255,255,0.68)", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.7px" };
}

function inputStyle() {
  return { width: "100%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 13, padding: "12px 13px", font: "inherit", fontSize: 15 };
}

function secondaryButton() {
  return { border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: 900, cursor: "pointer" };
}

function primaryButton(color) {
  return { border: "none", background: color, color: "#101418", borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: "pointer" };
}

function dangerButton() {
  return { border: "1px solid rgba(248,113,113,0.45)", background: "rgba(248,113,113,0.2)", color: "#fca5a5", borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: "pointer" };
}

function dangerGhostButton() {
  return { border: "1px solid rgba(248,113,113,0.34)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", borderRadius: 14, minHeight: 48, fontSize: 14, fontWeight: 950, cursor: "pointer" };
}
