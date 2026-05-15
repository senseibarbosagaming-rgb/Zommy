import { useMemo } from "react";
import { useZommyData } from "./useZommyData";

const COPY = {
  en: {
    loading: "Getting your family memories…",
    noChildTitle: "Start a child’s story",
    noChildBody: "Create a quiet place for their memories first.",
    addChild: "Add child",
    saveMemory: "Save memory",
    openStory: "Open story",
    settings: "Settings",
    latest: "Latest memory",
    memories: (count) => `${count} ${count === 1 ? "memory" : "memories"} saved`,
    empty: "No memories yet. Save one small moment to start.",
    reload: "Reload app",
  },
  pt: {
    loading: "A carregar as memórias da família…",
    noChildTitle: "Começa a história de uma criança",
    noChildBody: "Cria primeiro um lugar calmo para guardar as memórias.",
    addChild: "Adicionar criança",
    saveMemory: "Guardar memória",
    openStory: "Abrir história",
    settings: "Definições",
    latest: "Última memória",
    memories: (count) => `${count} ${count === 1 ? "memória guardada" : "memórias guardadas"}`,
    empty: "Ainda não há memórias. Guarda um pequeno momento para começar.",
    reload: "Recarregar app",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const getCopy = () => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en;

const openHome = () => window.dispatchEvent(new CustomEvent("zommy:show-today"));
const openSettings = () => window.dispatchEvent(new CustomEvent("zommy:show-settings"));
const openProfileCreator = () => window.dispatchEvent(new CustomEvent("zommy:open-profile-creator"));
const openComposer = (profileId) => window.dispatchEvent(new CustomEvent("zommy:open-memory-composer", { detail: { profileId } }));
const openTimeline = (profileId) => window.dispatchEvent(new CustomEvent("zommy:show-timeline", { detail: { profileId } }));

export default function ShellFallbackLayer() {
  const { user, profiles, entries, loading, error, refresh } = useZommyData({ includeEntries: true, includeLocal: false, entryLimit: 20 });
  const copy = useMemo(getCopy, []);

  if (!user) return null;

  const profile = profiles[0];
  const childEntries = profile ? entries.filter((entry) => entry.profile_id === profile.id) : [];
  const latest = childEntries[0];
  const tone = profile?.color || "#D9826B";

  return (
    <main aria-label="Zommy fallback home" style={{ position: "fixed", inset: 0, zIndex: 130, background: "radial-gradient(circle at top left, #FFF1E5 0, #FFFDF7 48%, #FFF8EE 100%)", color: "#3A2A22", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif", pointerEvents: "auto" }}>
      <div style={{ maxWidth: 480, minHeight: "100dvh", margin: "0 auto", padding: "96px 16px calc(112px + env(safe-area-inset-bottom, 0px))", display: "grid", gap: 14 }}>
        {loading && !profile && <p style={{ color: "#80695B", fontSize: 14 }}>{copy.loading}</p>}

        {!loading && !profile && (
          <section style={cardStyle()}>
            <div style={{ width: 64, height: 64, borderRadius: 22, background: "#F8E9DC", display: "grid", placeItems: "center", fontSize: 34 }}>👶</div>
            <div>
              <h1 style={titleStyle()}>{copy.noChildTitle}</h1>
              <p style={bodyStyle()}>{copy.noChildBody}</p>
            </div>
            <button onClick={openProfileCreator} style={primaryButton("#D9826B")}>{copy.addChild}</button>
          </section>
        )}

        {profile && (
          <>
            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div>
                  <div style={{ color: tone, fontSize: 12, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>Zommy</div>
                  <h1 style={titleStyle()}>{profile.name}</h1>
                  <p style={bodyStyle()}>{copy.memories(childEntries.length)}</p>
                </div>
                <button onClick={openHome} aria-label="Open home" style={{ width: 66, height: 66, borderRadius: 24, border: "none", background: `${tone}22`, color: tone, display: "grid", placeItems: "center", fontSize: 34, cursor: "pointer" }}>{profile.emoji || "👶"}</button>
              </div>
              <button onClick={() => openComposer(profile.id)} style={primaryButton(tone)}>+ {copy.saveMemory}</button>
            </section>

            <section style={cardStyle()}>
              <div style={{ color: "#80695B", fontSize: 11, fontWeight: 950, letterSpacing: "0.8px", textTransform: "uppercase" }}>{copy.latest}</div>
              {latest?.photoUrl ? (
                <button onClick={() => openTimeline(profile.id)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                  <img src={latest.photoUrl} alt={`${profile.name} memory`} style={{ width: "100%", height: 260, objectFit: "cover", objectPosition: latest.cover_position || "50% 50%", borderRadius: 22, display: "block", background: "#F8E9DC" }} />
                </button>
              ) : (
                <button onClick={() => openComposer(profile.id)} style={{ border: "1px dashed rgba(122,77,57,0.24)", background: "#F8E9DC", color: "#80695B", borderRadius: 22, minHeight: 180, padding: 16, display: "grid", placeItems: "center", textAlign: "center", fontSize: 14, lineHeight: 1.5, cursor: "pointer" }}>{copy.empty}</button>
              )}
              {latest?.note && <p style={bodyStyle()}>{latest.note}</p>}
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => openTimeline(profile.id)} style={secondaryButton()}>{copy.openStory}</button>
              <button onClick={openSettings} style={secondaryButton()}>{copy.settings}</button>
            </section>
          </>
        )}

        {error && (
          <section style={{ ...cardStyle(), borderColor: "rgba(217,130,107,0.28)" }}>
            <p style={bodyStyle()}>{String(error.message || error)}</p>
            <button onClick={() => refresh()} style={primaryButton("#D9826B")}>{copy.reload}</button>
          </section>
        )}
      </div>
    </main>
  );
}

const cardStyle = () => ({ border: "1px solid rgba(122,77,57,0.16)", background: "rgba(255,253,247,0.88)", borderRadius: 28, padding: 16, display: "grid", gap: 14, boxShadow: "0 18px 50px rgba(122,77,57,0.10)" });
const titleStyle = () => ({ fontFamily: "Lora, Georgia, serif", fontSize: 36, lineHeight: 1.06, fontWeight: 650, marginTop: 4 });
const bodyStyle = () => ({ color: "#80695B", fontSize: 14, lineHeight: 1.6 });
const primaryButton = (tone) => ({ border: "none", background: tone, color: "#FFFDF7", borderRadius: 20, minHeight: 56, padding: "14px 16px", fontSize: 16, fontWeight: 950, cursor: "pointer", boxShadow: `0 14px 34px ${tone}33` });
const secondaryButton = () => ({ border: "1px solid rgba(122,77,57,0.16)", background: "#FFFDF7", color: "#3A2A22", borderRadius: 18, minHeight: 52, padding: "12px", fontSize: 14, fontWeight: 900, cursor: "pointer" });
