import { useEffect, useMemo, useState } from "react";
import { appSurface, contentFrame, palette, type } from "./designSystem";
import { supabase } from "./supabase";

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const COPY = {
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
    cancel: "Not now",
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
    cancel: "Agora não",
  },
};

export default function FirstRunExperience() {
  const [checking, setChecking] = useState(true);
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);

  const prefs = useMemo(getPrefs, []);
  const copy = COPY[prefs.lang === "pt" ? "pt" : "en"] || COPY.en;

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

      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .is("archived_at", null);

      if (!mounted) return;
      setUser(currentUser);
      setVisible(!error && count === 0 && sessionStorage.getItem("zommy_first_run_dismissed") !== "1");
      setChecking(false);
    };

    checkFirstRun();
    window.addEventListener("zommy:profiles-changed", checkFirstRun);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkFirstRun());

    return () => {
      mounted = false;
      window.removeEventListener("zommy:profiles-changed", checkFirstRun);
      subscription.unsubscribe();
    };
  }, []);

  if (checking || !visible || !user) return null;

  const dismiss = () => {
    sessionStorage.setItem("zommy_first_run_dismissed", "1");
    setVisible(false);
  };

  const begin = () => {
    dismiss();
    window.dispatchEvent(new CustomEvent("zommy:open-profile-creator"));
  };

  return (
    <div style={{ ...appSurface, zIndex: 1000 }}>
      <div style={{ ...contentFrame(34), display: "flex", flexDirection: "column", gap: 24 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
          <div aria-label="Zommy" style={{ fontFamily: type.serif, fontWeight: type.weight.heading, fontSize: 26 }}>Zommy</div>
          <button onClick={dismiss} style={ghostButtonStyle}>
            {copy.cancel}
          </button>
        </header>

        <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section style={{ paddingTop: 8 }}>
            <h1 style={titleStyle}>{copy.title}</h1>
            <p style={bodyStyle}>{copy.body}</p>
          </section>

          <section style={previewCardStyle}>
            <div style={eyebrowStyle}>{copy.previewLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 10 }}>
              <div style={largePhotoStyle}>
                <div style={photoCaptionStyle}>
                  <div style={{ fontFamily: type.serif, fontSize: 18, fontWeight: type.weight.heading }}>{copy.fakeCardTitle}</div>
                  <div style={{ color: palette.overlaySoft, fontSize: 12, marginTop: 4 }}>{copy.fakeCardMeta}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={smallPhotoStyle}>
                  <div style={{ position: "absolute", left: 10, bottom: 10, fontSize: 11, fontWeight: type.weight.ui, color: palette.surface, textShadow: "0 1px 8px rgba(0,0,0,0.28)" }}>{copy.fakeTileMeta}</div>
                </div>
                <div style={notificationPreviewStyle}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: palette.accent }} />
                    <span style={{ fontSize: 11, color: palette.muted, fontWeight: type.weight.ui }}>Zommy</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: type.weight.heading }}>{copy.fakeNotificationTitle}</div>
                  <div style={{ fontSize: 11, color: palette.faint, marginTop: 3 }}>{copy.fakeNotificationBody}</div>
                </div>
              </div>
            </div>
          </section>

          <button onClick={begin} style={primaryButtonStyle}>
            {copy.addFirstChild}
          </button>
        </main>
      </div>
    </div>
  );
}

const titleStyle = { fontFamily: type.serif, fontSize: 38, lineHeight: 1.06, letterSpacing: 0, fontWeight: type.weight.heading, maxWidth: 390 };
const bodyStyle = { marginTop: 14, color: palette.muted, lineHeight: 1.65, fontSize: 15 };
const eyebrowStyle = { color: palette.muted, textTransform: "uppercase", letterSpacing: 0, fontSize: 10, fontWeight: type.weight.ui, marginBottom: 12 };
const ghostButtonStyle = { border: `1px solid ${palette.line}`, background: palette.surface, color: palette.muted, borderRadius: 999, minHeight: 48, padding: "8px 14px", fontSize: 13, fontWeight: type.weight.ui, cursor: "pointer" };
const previewCardStyle = { border: "none", borderRadius: 20, padding: 16, background: palette.surface, boxShadow: palette.shadow };
const largePhotoStyle = { minHeight: 176, borderRadius: 18, overflow: "hidden", background: `linear-gradient(145deg, ${palette.deep}, ${palette.accent})`, position: "relative" };
const smallPhotoStyle = { flex: 1, borderRadius: 16, background: `linear-gradient(145deg, ${palette.sage}, ${palette.softBlue})`, position: "relative", overflow: "hidden" };
const photoCaptionStyle = { position: "absolute", left: 14, right: 14, bottom: 14, color: palette.surface, textShadow: "0 1px 14px rgba(0,0,0,0.25)" };
const notificationPreviewStyle = { background: palette.milk, borderRadius: 16, padding: 11, boxShadow: palette.shadow };
const primaryButtonStyle = { width: "100%", border: "none", background: palette.accent, color: palette.surface, borderRadius: 16, minHeight: 54, padding: "16px 18px", fontSize: 16, fontWeight: type.weight.heading, cursor: "pointer", boxShadow: palette.shadow };
