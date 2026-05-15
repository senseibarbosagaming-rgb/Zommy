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
    master.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
    master.connect(context.destination);

    const makeTone = (frequency, start, duration, type = "sine", gain = 0.26) => {
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

    makeTone(196, 0.02, 0.28, "sine", 0.18);
    makeTone(247, 0.22, 0.30, "triangle", 0.14);
    makeTone(330, 0.42, 0.34, "sine", 0.11);

    window.setTimeout(() => context.close?.().catch?.(() => null), 1200);
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

    const timeout = window.setTimeout(() => setVisible(false), 1700);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 2500, background: "radial-gradient(circle at 50% 44%, #FFFDF7 0%, #FFF4E8 54%, #F2DDCC 100%)", display: "grid", placeItems: "center", overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        .zommy-intro-shell { animation: zIntroShell 1.58s cubic-bezier(.18,.9,.2,1) forwards; }
        .zommy-intro-line { stroke-dasharray: 360; stroke-dashoffset: 360; animation: zIntroDraw .7s cubic-bezier(.2,.86,.18,1) .12s forwards; }
        .zommy-intro-heart { opacity: 0; transform-origin: 60px 68px; animation: zIntroHeart .42s ease .7s forwards; }
        .zommy-intro-word { opacity: 0; transform: translateY(10px); animation: zIntroWord .46s ease .86s forwards; }
        .zommy-intro-pulse { opacity: 0; transform: scale(.82); animation: zIntroPulse 1.05s ease .44s forwards; }
        @keyframes zIntroDraw { to { stroke-dashoffset: 0; } }
        @keyframes zIntroHeart { to { opacity: 1; transform: scale(1); } }
        @keyframes zIntroWord { to { opacity: 1; transform: translateY(0); } }
        @keyframes zIntroPulse { 0% { opacity: 0; transform: scale(.82); } 42% { opacity: .55; transform: scale(1.08); } 100% { opacity: 0; transform: scale(1.32); } }
        @keyframes zIntroShell { 0%, 74% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.025); } }
        @media (prefers-reduced-motion: reduce) {
          .zommy-intro-shell, .zommy-intro-line, .zommy-intro-heart, .zommy-intro-word, .zommy-intro-pulse { animation-duration: .001ms !important; animation-delay: 0ms !important; }
        }
      `}</style>
      <div className="zommy-intro-shell" style={{ display: "grid", justifyItems: "center", gap: 18 }}>
        <div style={{ width: 168, height: 168, borderRadius: 48, background: "linear-gradient(145deg, #FFFDF7, #FFE2D1)", border: "1px solid rgba(122,77,57,.14)", boxShadow: "0 36px 100px rgba(122,77,57,.2)", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
          <div className="zommy-intro-pulse" style={{ position: "absolute", inset: 18, border: "1px solid rgba(217,130,107,.42)", borderRadius: 38 }} />
          <svg viewBox="0 0 120 120" width="104" height="104" fill="none">
            <path className="zommy-intro-line" d="M24 58L60 30L96 58" stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path className="zommy-intro-line" d="M36 54V92H84V54" stroke="#7A4D39" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path className="zommy-intro-heart" d="M60 84C49 76 42 68 42 58C42 51 48 46 55 46C59 46 62 48 65 52C68 48 72 46 76 46C83 46 89 51 89 58C89 70 75 79 60 88" fill="#D9826B" />
          </svg>
        </div>
        <div className="zommy-intro-word" style={{ color: "#3A2A22", fontFamily: "Inter, system-ui, sans-serif", fontSize: 33, fontWeight: 950, letterSpacing: "-1.6px" }}>Zommy</div>
      </div>
    </div>
  );
}