import { useEffect, useMemo, useState } from "react";
import { field, memoryTones, palette, type } from "./designSystem";
import { supabase } from "./supabase";

const PALETTE = memoryTones;

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];

const COPY = {
  en: {
    title: "Begin their story",
    body: "Create a private place for the small moments you want to keep.",
    name: "Name",
    birthDate: "Birth date",
    emoji: "Emoji",
    color: "Memory tone",
    cancel: "Cancel",
    save: "Start story",
    saving: "Creating…",
    nameError: "Add a name first.",
    birthError: "Add a birth date first.",
    error: "Could not create the profile. Try again.",
    done: "Profile created.",
  },
  pt: {
    title: "Adicionar criança",
    body: "Cria um lugar calmo para guardar as memórias.",
    name: "Nome",
    birthDate: "Data de nascimento",
    emoji: "Emoji",
    color: "Cor",
    cancel: "Cancelar",
    save: "Criar perfil",
    saving: "A criar…",
    nameError: "Adiciona primeiro um nome.",
    birthError: "Adiciona primeiro a data de nascimento.",
    error: "Não foi possível criar o perfil. Tenta de novo.",
    done: "Perfil criado.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export default function ChildProfileCreator() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [emoji, setEmoji] = useState("👶");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const prefs = useMemo(getPrefs, []);
  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] || COPY.en;
  const selectedPalette = PALETTE[paletteIndex];

  useEffect(() => {
    const openCreator = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setMessage("");
      setOpen(true);
    };
    window.addEventListener("zommy:open-profile-creator", openCreator);
    return () => window.removeEventListener("zommy:open-profile-creator", openCreator);
  }, []);

  if (!open || !user) return null;

  const close = () => {
    if (saving) return;
    setOpen(false);
    setName("");
    setBirthdate("");
    setEmoji("👶");
    setPaletteIndex(0);
    setMessage("");
  };

  const createProfile = async () => {
    setMessage("");
    if (!name.trim()) { setMessage(copy.nameError); return; }
    if (!birthdate) { setMessage(copy.birthError); return; }

    setSaving(true);
    const id = `child_${Date.now()}`;
    const { data, error } = await supabase.from("profiles").insert({
      id,
      user_id: user.id,
      name: name.trim(),
      birthdate,
      emoji,
      color: selectedPalette.color,
      bg: selectedPalette.bg,
    }).select("*").single();
    setSaving(false);

    if (error) {
      console.error("Failed to create child profile", error);
      setMessage(copy.error);
      return;
    }

    setMessage(copy.done);
    window.dispatchEvent(new CustomEvent("zommy:profiles-changed"));
    window.dispatchEvent(new CustomEvent("zommy:show-today"));
    window.setTimeout(() => {
      close();
      window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId: data?.id || id } }));
    }, 350);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1750, background: "rgba(46,41,35,0.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14, fontFamily: type.sans }} onClick={close}>
      <section role="dialog" aria-modal="true" aria-labelledby="zommy-child-profile-title" style={{ width: "100%", maxWidth: 452, background: palette.paper, color: palette.ink, border: `1px solid ${palette.border}`, borderRadius: 28, padding: 18, boxShadow: "0 24px 90px rgba(122,77,57,0.22)", display: "grid", gap: 15 }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 id="zommy-child-profile-title" style={{ fontFamily: type.serif, fontSize: 27, lineHeight: 1.12 }}>{copy.title}</h2>
            <p style={{ color: palette.inkMuted, fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{copy.body}</p>
          </div>
          <button onClick={close} disabled={saving} aria-label={copy.cancel} style={{ border: `1px solid ${palette.border}`, background: palette.paperSoft, color: palette.ink, borderRadius: 999, minWidth: 44, minHeight: 44, cursor: saving ? "wait" : "pointer", fontSize: 20 }}>×</button>
        </div>

        <label style={labelStyle()}>{copy.name}<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tommy" autoFocus style={inputStyle()} /></label>
        <label style={labelStyle()}>{copy.birthDate}<input type="date" value={birthdate} max={today()} onChange={(event) => setBirthdate(event.target.value)} style={inputStyle()} /></label>

        <div style={labelStyle()}>
          {copy.emoji}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{EMOJIS.map((item) => (
            <button key={item} onClick={() => setEmoji(item)} disabled={saving} style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${emoji === item ? palette.clay : "rgba(122,77,57,0.16)"}`, background: emoji === item ? "rgba(217,130,107,0.12)" : "#F8E9DC", fontSize: 21, cursor: "pointer" }}>{item}</button>
          ))}</div>
        </div>

        <div style={labelStyle()}>
          {copy.color}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{PALETTE.map((item, index) => (
            <button key={item.color} onClick={() => setPaletteIndex(index)} disabled={saving} aria-label={`${copy.color} ${index + 1}`} style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(122,77,57,0.12)", background: item.color, outline: paletteIndex === index ? `3px solid ${item.bg}` : "none", outlineOffset: 4, cursor: "pointer" }} />
          ))}</div>
        </div>

        {message && <div role="status" style={{ color: message === copy.done ? palette.sage : palette.clay, fontSize: 13, fontWeight: 850 }}>{message}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <button onClick={close} disabled={saving} style={{ border: `1px solid ${palette.border}`, background: palette.paperSoft, color: palette.ink, borderRadius: 16, minHeight: 50, fontSize: 14, fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>{copy.cancel}</button>
          <button onClick={createProfile} disabled={saving} style={{ border: "none", background: selectedPalette.color, color: palette.paper, borderRadius: 16, minHeight: 50, fontSize: 14, fontWeight: 950, cursor: saving ? "wait" : "pointer", boxShadow: `0 12px 28px ${selectedPalette.color}33` }}>{saving ? copy.saving : copy.save}</button>
        </div>
      </section>
    </div>
  );
}

const labelStyle = () => ({ display: "grid", gap: 7, color: palette.inkMuted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.7px" });
const inputStyle = () => ({ width: "100%", border: `1px solid ${palette.border}`, background: "#FFFFFF", color: "#3A2A22", borderRadius: 14, padding: "12px 13px", font: "inherit", fontSize: 15 });