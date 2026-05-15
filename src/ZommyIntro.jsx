import { useEffect, useRef, useState } from "react";

const INTRO_KEY = "zommy_intro_seen_v1";

function playIntroSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);
    master.connect(context.destination);

    const makeTone = (frequency, start, duration, type = "sine", gain = 0.42) => {
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now + start);
      amp.gain.setValueAtTime(0.0001, now + start);
      amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.03);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(amp);
      amp.connect(master);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    makeTone(82, 0.02, 0.34, "sine", 0.32);
    makeTone(123, 0.23, 0.36, "triangle", 0.26);
    makeTone(196, 0.46, 0.42, "sine", 0.18);

    window.setTimeout(() => context.close?.().catch?.(() => null), 1400);
  } catch {
    // Browsers often block autoplay audio. Visual intro still works.
  }
}

export default function ZommyIntro() {
  const [visible, setVisible] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(INTRO_KEY) === "1";
    if (seen) return;

    sessionStorage.setItem(INTRO_KEY, "1");
    setVisible(true);

    const splash = document.getElementById("zommy-splash");
    if (splash) splash.style.display = "none";

    if (!played.current) {
      played.current = true;
      playIntroSound();
    }

    const timeout = window.setTimeout(() => setVisible(false), 1850);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 2500, background: "radial-gradient(circle at 50% 45%, #1b2733 0%, #101418 56%, #050708 100%)", display: "grid", placeItems: "center", overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        .zommy-intro-shell { animation: zIntroShell 1.72s cubic-bezier(.18,.9,.2,1) forwards; }
        .zommy-intro-z { stroke-dasharray: 520; stroke-dashoffset: 520; animation: zIntroDraw .82s cubic-bezier(.2,.86,.18,1) .12s forwards, zIntroGlow 1.25s ease .28s forwards; }
        .zommy-intro-top { stroke-dasharray: 160; stroke-dashoffset: 160; animation: zIntroDraw .34s ease .86s forwards; }
        .zommy-intro-bottom { stroke-dasharray: 160; stroke-dashoffset: 160; animation: zIntroDraw .34s ease .98s forwards; }
        .zommy-intro-word { opacity: 0; transform: translateY(10px); animation: zIntroWord .48s ease .98s forwards; }
        .zommy-intro-pulse { opacity: 0; transform: scale(.82); animation: zIntroPulse 1.1s ease .52s forwards; }
        @keyframes zIntroDraw { to { stroke-dashoffset: 0; } }
        @keyframes zIntroGlow { 0% { filter: drop-shadow(0 0 0 rgba(248,250,252,0)); } 58% { filter: drop-shadow(0 0 30px rgba(248,250,252,.36)); } 100% { filter: drop-shadow(0 0 14px rgba(52,211,153,.28)); } }
        @keyframes zIntroWord { to { opacity: 1; transform: translateY(0); } }
        @keyframes zIntroPulse { 0% { opacity: 0; transform: scale(.82); } 40% { opacity: .78; transform: scale(1.1); } 100% { opacity: 0; transform: scale(1.35); } }
        @keyframes zIntroShell { 0%, 74% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.035); } }
        @media (prefers-reduced-motion: reduce) {
          .zommy-intro-shell, .zommy-intro-z, .zommy-intro-top, .zommy-intro-bottom, .zommy-intro-word, .zommy-intro-pulse { animation-duration: .001ms !important; animation-delay: 0ms !important; }
        }
      `}</style>
      <div className="zommy-intro-shell" style={{ display: "grid", justifyItems: "center", gap: 18 }}>
        <div style={{ width: 168, height: 168, borderRadius: 44, background: "linear-gradient(145deg, rgba(27,39,51,.96), rgba(16,20,24,.98) 58%, rgba(38,58,69,.95))", boxShadow: "0 36px 120px rgba(0,0,0,.5)", display: "grid", placeItems: "center", position: "relative" }}>
          <div className="zommy-intro-pulse" style={{ position: "absolute", inset: 16, border: "1px solid rgba(52,211,153,.46)", borderRadius: 34 }} />
          <svg viewBox="0 0 180 180" width="112" height="112" fill="none">
            <path className="zommy-intro-z" d="M34 44H142L56 136H136" stroke="#F8FAFC" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
            <path className="zommy-intro-top" d="M34 44H142" stroke="#34D399" strokeWidth="7" strokeLinecap="round" opacity=".92" />
            <path className="zommy-intro-bottom" d="M56 136H136" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" opacity=".9" />
          </svg>
        </div>
        <div className="zommy-intro-word" style={{ color: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif", fontSize: 33, fontWeight: 950, letterSpacing: "-1.6px" }}>Zommy</div>
      </div>
    </div>
  );
}
