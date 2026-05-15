import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const PALETTE = [
  { color: "#60A5FA", bg: "#1e3a5f" },
  { color: "#F472B6", bg: "#5f1e3a" },
  { color: "#34D399", bg: "#1e5f3a" },
  { color: "#FBBF24", bg: "#5f4a1e" },
  { color: "#A78BFA", bg: "#3a1e5f" },
  { color: "#FB7185", bg: "#5f1e2a" },
];

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split("T")[0];
};

const getPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem("zommy_prefs") || "{}");
  } catch {
    return {};
  }
};

const copyByLang = {
  en: {
    title: "Start a timeline for someone you love.",
    body: "Save one photo today. A year from now, Zommy can bring it back when it actually matters.",
    addFirstChild: "Add first child",
    previewLabel: "What Zommy becomes",
    fakeCardTitle: "First sleepy smile",
    fakeCardMeta: "Today · 7 weeks old",
    fakeTileMeta: "Timeline tile",
    fakeNotificationTitle: "1 year ago today",
    fakeNotificationBody: "Tommy · First sleepy smile",
    profileTitle: "Who is this timeline for?",
    firstMemoryTitle: (name) => `Save ${name}'s first memory`,
    firstMemoryBody: "This is the moment the app starts working for you.",
    name: "Name",
    birthDate: "Birth date",
    emoji: "Emoji",
    color: "Colour",
    createProfile: "Create profile",
    photo: "Photo",
    date: "Date",
    note: "Note",
    notePlaceholder: "What happened? Keep it short, imperfect, real.",
    addPhoto: "Add a photo",
    saveFirstMemory: "Save first memory",
    saving: "Saving…",
    cancel: "Not now",
    nameError: "Add a name first.",
    birthError: "Add a birth date first.",
    photoError: "Add a photo first.",
    genericError: "Something went wrong. Try again.",
    done: "First memory saved.",
  },
  pt: {
    title: "Começa uma timeline para alguém que amas.",
    body: "Guarda uma foto hoje. Daqui a um ano, o Zommy pode trazê-la de volta quando fizer sentido.",
    addFirstChild: "Adicionar primeira criança",
    previewLabel: "Aquilo em que o Zommy se torna",
    fakeCardTitle: "Primeiro sorriso sonolento",
    fakeCardMeta: "Hoje · 7 semanas",
    fakeTileMeta: "Tile da timeline",
    fakeNotificationTitle: "Há 1 ano neste dia",
    fakeNotificationBody: "Tommy · Primeiro sorriso sonolento",
    profileTitle: "Para quem é esta timeline?",
    firstMemoryTitle: (name) => `Guarda a primeira memória de ${name}`,
    firstMemoryBody: "É aqui que a app começa realmente a funcionar para ti.",
    name: "Nome",
    birthDate: "Data de nascimento",
    emoji: "Emoji",
    color: "Cor",
    createProfile: "Criar perfil",
    photo: "Foto",
    date: "Data",
    note: "Nota",
    notePlaceholder: "O que aconteceu? Curto, imperfeito, real.",
    addPhoto: "Adicionar foto",
    saveFirstMemory: "Guardar primeira memória",
    saving: "A guardar…",
    cancel: "Agora não",
    nameError: "Adiciona primeiro um nome.",
    birthError: "Adiciona primeiro a data de nascimento.",
    photoError: "Adiciona primeiro uma foto.",
    genericError: "Algo correu mal. Tenta outra vez.",
    done: "Primeira memória guardada.",
  },
};

const uploadPhoto = async (userId, file) => {
  const extension = file.name?.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(extension) ? extension : "jpg";
  const path = `${userId}/${Date.now()}.${safeExtension}`;
  const { data, error } = await supabase.storage
    .from("photos")
    .upload(path, file, { contentType: file.type || "image/jpeg" });

  if (error) throw error;
  return data.path;
};

export default function FirstRunExperience() {
  const [checking, setChecking] = useState(true);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState("intro");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [emoji, setEmoji] = useState("👶");
  const [paletteIndex, setPaletteIndex] = useState(0);

  const [memoryDate, setMemoryDate] = useState(today());
  const [memoryFile, setMemoryFile] = useState(null);
  const [memoryPreview, setMemoryPreview] = useState("");
  const [memoryNote, setMemoryNote] = useState("");

  const prefs = useMemo(getPrefs, []);
  const lang = prefs.lang === "pt" ? "pt" : "en";
  const c = copyByLang[lang];
  const selectedPalette = PALETTE[paletteIndex];

  useEffect(() => {
    let mounted = true;

    const checkFirstRun = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;

      if (!currentUser) {
        if (mounted) {
          setUser(null);
          setVisible(false);
          setChecking(false);
        }
        return;
      }

      const { count, error: profileError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id);

      if (!mounted) return;

      setUser(currentUser);
      setVisible(!profileError && count === 0 && sessionStorage.getItem("zommy_first_run_dismissed") !== "1");
      setChecking(false);
    };

    checkFirstRun();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkFirstRun();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (memoryPreview) URL.revokeObjectURL(memoryPreview);
    };
  }, [memoryPreview]);

  if (checking || !visible || !user) return null;

  const dismiss = () => {
    sessionStorage.setItem("zommy_first_run_dismissed", "1");
    setVisible(false);
  };

  const createProfile = async () => {
    setError("");
    if (!name.trim()) { setError(c.nameError); return; }
    if (!birthdate) { setError(c.birthError); return; }

    setSaving(true);
    try {
      const id = `child_${Date.now()}`;
      const nextProfile = {
        id,
        user_id: user.id,
        name: name.trim(),
        birthdate,
        emoji,
        color: selectedPalette.color,
        bg: selectedPalette.bg,
      };

      const { error: insertError } = await supabase.from("profiles").insert(nextProfile);
      if (insertError) throw insertError;

      setProfile(nextProfile);
      setStep("memory");
    } catch (err) {
      console.error("Failed to create first-run profile", err);
      setError(c.genericError);
    }
    setSaving(false);
  };

  const saveFirstMemory = async () => {
    setError("");
    if (!memoryFile) { setError(c.photoError); return; }
    if (!profile) { setError(c.genericError); return; }

    setSaving(true);
    try {
      const photoPath = await uploadPhoto(user.id, memoryFile);
      const { error: insertError } = await supabase.from("entries").insert({
        id: Date.now(),
        user_id: user.id,
        profile_id: profile.id,
        date: memoryDate,
        photo_path: photoPath,
        note: memoryNote.trim(),
      });

      if (insertError) throw insertError;

      sessionStorage.setItem("zommy_first_run_dismissed", "1");
      setError(c.done);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error("Failed to save first-run memory", err);
      setError(c.genericError);
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    borderRadius: 14,
    padding: "13px 14px",
    font: "inherit",
    fontSize: 15,
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#101418", color: "#fff", overflowY: "auto" }}>
      <div style={{ minHeight: "100dvh", maxWidth: 480, margin: "0 auto", padding: "22px 20px 34px", display: "flex", flexDirection: "column", gap: 22, fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
          <div style={{ fontWeight: 800, letterSpacing: "-0.7px", fontSize: 24 }}>ZOOMY</div>
          <button onClick={dismiss} disabled={saving} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.68)", borderRadius: 999, padding: "8px 12px", fontSize: 13, cursor: saving ? "wait" : "pointer" }}>
            {c.cancel}
          </button>
        </header>

        {step === "intro" && (
          <main style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <section style={{ paddingTop: 14 }}>
              <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 37, lineHeight: 1.05, letterSpacing: "-1px", fontWeight: 600, maxWidth: 380 }}>{c.title}</h1>
              <p style={{ marginTop: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.65, fontSize: 15 }}>{c.body}</p>
            </section>

            <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" }}>
              <div style={{ color: "rgba(255,255,255,0.48)", textTransform: "uppercase", letterSpacing: "0.9px", fontSize: 10, fontWeight: 700, marginBottom: 12 }}>{c.previewLabel}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
                <div style={{ minHeight: 176, borderRadius: 18, overflow: "hidden", background: "linear-gradient(145deg, #1e3a5f, #5f1e3a)", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.34), transparent 28%), radial-gradient(circle at 66% 54%, rgba(251,191,36,0.38), transparent 23%)" }} />
                  <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                    <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 600 }}>{c.fakeCardTitle}</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>{c.fakeCardMeta}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ flex: 1, borderRadius: 16, background: "linear-gradient(145deg, #34D399, #60A5FA)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 35%, rgba(255,255,255,0.34), transparent 28%)" }} />
                    <div style={{ position: "absolute", left: 10, bottom: 10, fontSize: 11, fontWeight: 700, textShadow: "0 1px 8px rgba(0,0,0,0.28)" }}>{c.fakeTileMeta}</div>
                  </div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.28)", borderRadius: 16, padding: 11 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399" }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.54)", fontWeight: 700 }}>ZOOMY</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.fakeNotificationTitle}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>{c.fakeNotificationBody}</div>
                  </div>
                </div>
              </div>
            </section>

            <button onClick={() => setStep("profile")} style={{ width: "100%", border: "none", background: "#fff", color: "#101418", borderRadius: 16, padding: "16px 18px", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 14px 40px rgba(255,255,255,0.12)" }}>
              {c.addFirstChild}
            </button>
          </main>
        )}

        {step === "profile" && (
          <main style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 31, lineHeight: 1.12, fontWeight: 600 }}>{c.profileTitle}</h1>
            <label style={{ display: "grid", gap: 7, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {c.name}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tommy" style={fieldStyle} autoFocus />
            </label>
            <label style={{ display: "grid", gap: 7, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {c.birthDate}
              <input type="date" value={birthdate} max={today()} onChange={(e) => setBirthdate(e.target.value)} style={fieldStyle} />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{c.emoji}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {EMOJIS.map((item) => (
                  <button key={item} onClick={() => setEmoji(item)} style={{ width: 43, height: 43, borderRadius: 13, border: `1.5px solid ${emoji === item ? "#fff" : "rgba(255,255,255,0.14)"}`, background: emoji === item ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)", fontSize: 21, cursor: "pointer" }}>{item}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{c.color}</div>
              <div style={{ display: "flex", gap: 12 }}>
                {PALETTE.map((item, index) => (
                  <button key={item.color} onClick={() => setPaletteIndex(index)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: item.color, outline: paletteIndex === index ? `3px solid ${item.color}` : "none", outlineOffset: 4, cursor: "pointer" }} />
                ))}
              </div>
            </div>

            {error && <div style={{ color: error === c.done ? "#34D399" : "#FB7185", fontSize: 13, lineHeight: 1.5 }}>{error}</div>}

            <button onClick={createProfile} disabled={saving} style={{ width: "100%", border: "none", background: selectedPalette.color, color: "#fff", borderRadius: 16, padding: "16px 18px", fontSize: 16, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? c.saving : c.createProfile}
            </button>
          </main>
        )}

        {step === "memory" && profile && (
          <main style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section>
              <div style={{ color: profile.color, fontSize: 12, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>{profile.emoji} {profile.name}</div>
              <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 31, lineHeight: 1.12, fontWeight: 600 }}>{c.firstMemoryTitle(profile.name)}</h1>
              <p style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontSize: 14 }}>{c.firstMemoryBody}</p>
            </section>

            <label style={{ display: "grid", gap: 7, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {c.date}
              <input type="date" value={memoryDate} max={today()} onChange={(e) => setMemoryDate(e.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: "grid", gap: 8, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {c.photo}
              <div style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 18, minHeight: 220, background: "rgba(255,255,255,0.05)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {memoryPreview ? (
                  <img src={memoryPreview} alt="" style={{ width: "100%", maxHeight: 340, objectFit: "contain", display: "block" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.56)", display: "grid", gap: 8 }}>
                    <span style={{ fontSize: 34 }}>📷</span>
                    <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 14, fontWeight: 600 }}>{c.addPhoto}</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (memoryPreview) URL.revokeObjectURL(memoryPreview);
                setMemoryFile(file);
                setMemoryPreview(URL.createObjectURL(file));
              }} style={{ ...fieldStyle, padding: 11 }} />
            </label>

            <label style={{ display: "grid", gap: 7, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {c.note}
              <textarea value={memoryNote} onChange={(e) => setMemoryNote(e.target.value)} placeholder={c.notePlaceholder} rows={3} style={{ ...fieldStyle, resize: "none", lineHeight: 1.55 }} />
            </label>

            {error && <div style={{ color: error === c.done ? "#34D399" : "#FB7185", fontSize: 13, lineHeight: 1.5 }}>{error}</div>}

            <button onClick={saveFirstMemory} disabled={saving} style={{ width: "100%", border: "none", background: profile.color, color: "#fff", borderRadius: 16, padding: "16px 18px", fontSize: 16, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? c.saving : c.saveFirstMemory}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}
