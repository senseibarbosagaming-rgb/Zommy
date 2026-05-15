import { useEffect, useMemo, useState } from "react";
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#101418", color: "#fff", overflowY: "auto" }}>
      <div style={{ minHeight: "100dvh", maxWidth: 480, margin: "0 auto", padding: "22px 20px 34px", display: "flex", flexDirection: "column", gap: 22, fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
          <div aria-label="Zommy" style={{ fontWeight: 900, letterSpacing: "-0.7px", fontSize: 24 }}>Zommy</div>
          <button onClick={dismiss} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)", borderRadius: 999, minHeight: 44, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>
            {copy.cancel}
          </button>
        </header>

        <main style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section style={{ paddingTop: 14 }}>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 37, lineHeight: 1.05, letterSpacing: "-1px", fontWeight: 600, maxWidth: 380 }}>{copy.title}</h1>
            <p style={{ marginTop: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, fontSize: 15 }}>{copy.body}</p>
          </section>

          <section style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 16, background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" }}>
            <div style={{ color: "rgba(255,255,255,0.56)", textTransform: "uppercase", letterSpacing: "0.9px", fontSize: 10, fontWeight: 800, marginBottom: 12 }}>{copy.previewLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
              <div style={{ minHeight: 176, borderRadius: 18, overflow: "hidden", background: "linear-gradient(145deg, #1e3a5f, #5f1e3a)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.34), transparent 28%), radial-gradient(circle at 66% 54%, rgba(251,191,36,0.38), transparent 23%)" }} />
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                  <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 600 }}>{copy.fakeCardTitle}</div>
                  <div style={{ color: "rgba(255,255,255,0.76)", fontSize: 12, marginTop: 4 }}>{copy.fakeCardMeta}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ flex: 1, borderRadius: 16, background: "linear-gradient(145deg, #34D399, #60A5FA)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 35%, rgba(255,255,255,0.34), transparent 28%)" }} />
                  <div style={{ position: "absolute", left: 10, bottom: 10, fontSize: 11, fontWeight: 800, textShadow: "0 1px 8px rgba(0,0,0,0.28)" }}>{copy.fakeTileMeta}</div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.28)", borderRadius: 16, padding: 11 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399" }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", fontWeight: 800 }}>Zommy</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{copy.fakeNotificationTitle}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)", marginTop: 3 }}>{copy.fakeNotificationBody}</div>
                </div>
              </div>
            </div>
          </section>

          <button onClick={begin} style={{ width: "100%", border: "none", background: "#fff", color: "#101418", borderRadius: 16, minHeight: 54, padding: "16px 18px", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 14px 40px rgba(255,255,255,0.12)" }}>
            {copy.addFirstChild}
          </button>
        </main>
      </div>
    </div>
  );
}
