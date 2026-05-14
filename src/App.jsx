import { useState, useRef } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-PT", {
    day: "numeric", month: "long", year: "numeric",
  });

const addMonths = (date, months) => {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0);
  return d;
};

const plural = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"}`;

const formatParts = (parts) =>
  parts.filter(({ count }) => count > 0).map(({ count, unit }) => plural(count, unit)).join(" ");

const getAge = (birthdate, onDate) => {
  if (!birthdate || !onDate) return null;
  const birth = new Date(birthdate + "T12:00:00");
  const on = new Date(onDate + "T12:00:00");
  if (on < birth) return null;

  let totalMonths = (on.getFullYear() - birth.getFullYear()) * 12 + (on.getMonth() - birth.getMonth());
  if (addMonths(birth, totalMonths) > on) totalMonths -= 1;

  if (totalMonths < 12) {
    const monthDate = addMonths(birth, totalMonths);
    const days = Math.floor((on - monthDate) / 86400000);
    const age = formatParts([
      { count: totalMonths, unit: "month" },
      { count: days, unit: "day" },
    ]);
    return `${age || "0 days"} old`;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const age = formatParts([
    { count: years, unit: "year" },
    { count: months, unit: "month" },
  ]);
  return `${age} old`;
};

const PALETTE = [
  { color: "#4A90D9", bg: "#EBF4FF" },
  { color: "#E87BAA", bg: "#FFF0F6" },
  { color: "#6DBF87", bg: "#EDFAF2" },
  { color: "#F5A623", bg: "#FFF8EC" },
  { color: "#9B6BE8", bg: "#F5EFFF" },
  { color: "#E8706B", bg: "#FFF0EF" },
];

const EMOJIS = ["👶", "👦", "👧", "🧒", "🐣", "⭐"];

// ── storage ───────────────────────────────────────────────────────────────────

const loadState = () => {
  try {
    const raw = localStorage.getItem("zommy_v2");
    return raw ? JSON.parse(raw) : { profiles: [], entries: {} };
  } catch { return { profiles: [], entries: {} }; }
};

const persist = (state) => {
  try { localStorage.setItem("zommy_v2", JSON.stringify(state)); } catch {}
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Zommy() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);

  const [logDate, setLogDate] = useState(today());
  const [logNote, setLogNote] = useState("");
  const [logPhoto, setLogPhoto] = useState(null);
  const [logPreview, setLogPreview] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const fileRef = useRef();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [newEmoji, setNewEmoji] = useState("👶");
  const [newPalette, setNewPalette] = useState(0);

  const [compareId, setCompareId] = useState(null);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const update = (s) => { setState(s); persist(s); };

  const active = state.profiles.find((p) => p.id === activeId);
  const activeEntries = activeId ? (state.entries[activeId] || []) : [];
  const sorted = [...activeEntries].sort((a, b) => {
    const dateSort = b.date.localeCompare(a.date);
    if (dateSort !== 0) return dateSort;
    return (b.id || 0) - (a.id || 0);
  });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { setLogPhoto(ev.target.result); setLogPreview(ev.target.result); };
    r.readAsDataURL(file);
  };

  const resetLogForm = () => {
    setLogDate(today()); setLogNote(""); setLogPhoto(null); setLogPreview(null); setEditingEntryId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveEntry = () => {
    if (!logPhoto) { showToast("Add a photo first 📷"); return; }
    const prev = state.entries[activeId] || [];
    const entry = { date: logDate, photo: logPhoto, note: logNote.trim(), id: editingEntryId || Date.now() };
    update({
      ...state,
      entries: {
        ...state.entries,
        [activeId]: [
          ...prev.filter((e) => e.id !== editingEntryId),
          entry,
        ].sort((a, b) => {
          const dateSort = b.date.localeCompare(a.date);
          if (dateSort !== 0) return dateSort;
          return (b.id || 0) - (a.id || 0);
        }),
      },
    });
    resetLogForm();
    showToast(editingEntryId ? "Updated ✓" : "Saved ✓");
    setView("timeline");
  };

  const createProfile = () => {
    if (!newName.trim()) { showToast("Add a name"); return; }
    if (!newBirth) { showToast("Add a birth date"); return; }
    const id = `child_${Date.now()}`;
    const pal = PALETTE[newPalette];
    update({
      ...state,
      profiles: [...state.profiles, { id, name: newName.trim(), birthdate: newBirth, emoji: newEmoji, color: pal.color, bg: pal.bg }],
      entries: { ...state.entries, [id]: [] },
    });
    setNewName(""); setNewBirth(""); setNewEmoji("👶"); setNewPalette(0); setShowForm(false);
    showToast(`${newName.trim()} added 🎉`);
  };

  const goLog = (id) => {
    setActiveId(id);
    resetLogForm();
    setView("log");
  };

  const editEntry = (entry) => {
    setLogDate(entry.date);
    setLogNote(entry.note || "");
    setLogPhoto(entry.photo);
    setLogPreview(entry.photo);
    setEditingEntryId(entry.id);
    setView("log");
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .f{animation:fu 0.3s ease forwards}
        @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .b{transition:all .15s;cursor:pointer}
        .b:hover{opacity:.8}
        .b:active{transform:scale(.96)}
        .c{transition:transform .2s,box-shadow .2s}
        .c:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.09)!important}
        input:focus,textarea:focus{outline:none}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
      `}</style>

      {toast && <div style={s.toast}>{toast}</div>}

      <header style={s.hdr}>
        <div style={s.hdrIn}>
          <div style={s.logo}>
            <span style={s.logoZ}>z</span><span style={s.logoR}>ommy</span>
          </div>
          {view !== "home" && (
            <button className="b" onClick={() => setView("home")} style={s.back}>← back</button>
          )}
        </div>
      </header>

      <main style={s.main}>

        {/* HOME */}
        {view === "home" && (
          <div className="f" style={s.home}>
            <p style={s.tagline}>A quiet record of them growing up.</p>

            {state.profiles.length === 0 && !showForm && (
              <div style={s.emptyHome}>
                <span style={{ fontSize: 46 }}>🌱</span>
                <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 1.7 }}>
                  No children yet.<br />Add your first profile to start.
                </p>
              </div>
            )}

            <div style={s.grid}>
              {state.profiles.map((p) => {
                const pe = state.entries[p.id] || [];
                const latest = [...pe].sort((a, b) => b.date.localeCompare(a.date))[0];
                const age = getAge(p.birthdate, today());
                return (
                  <div key={p.id} className="c" style={{ ...s.card, borderColor: p.color + "33" }}>
                    <div style={{ ...s.avt, background: p.bg }}>
                      {latest?.photo
                        ? <img src={latest.photo} alt={p.name} style={s.avtImg} />
                        : <span style={{ fontSize: 32 }}>{p.emoji}</span>}
                    </div>
                    <div style={s.pName}>{p.name}</div>
                    {age && <div style={{ ...s.pAge, color: p.color }}>{age}</div>}
                    <div style={s.pCount}>{pe.length} {pe.length === 1 ? "entry" : "entries"} logged</div>
                    <div style={s.pActions}>
                      <button className="b" style={{ ...s.btn1, background: p.color }} onClick={() => goLog(p.id)}>+ add entry</button>
                      <button className="b" style={{ ...s.btn2, color: p.color, borderColor: p.color + "44", background: p.bg }}
                        onClick={() => { setActiveId(p.id); setView("timeline"); }}>timeline</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {showForm ? (
              <div className="f" style={s.formCard}>
                <div style={s.formTitle}>New child</div>
                <label style={s.lbl}>Name</label>
                <input type="text" placeholder="e.g. Tommy" value={newName}
                  onChange={(e) => setNewName(e.target.value)} style={s.inp} />
                <label style={s.lbl}>Birth date</label>
                <input type="date" value={newBirth} max={today()}
                  onChange={(e) => setNewBirth(e.target.value)} style={s.inp} />
                <label style={s.lbl}>Emoji</label>
                <div style={s.emojiRow}>
                  {EMOJIS.map((em) => (
                    <button key={em} className="b" onClick={() => setNewEmoji(em)}
                      style={{ ...s.emojiBtn, background: newEmoji === em ? "#1a1a1a" : "#f0ede8" }}>{em}</button>
                  ))}
                </div>
                <label style={s.lbl}>Colour</label>
                <div style={s.palRow}>
                  {PALETTE.map((p, i) => (
                    <button key={i} className="b" onClick={() => setNewPalette(i)}
                      style={{ ...s.palDot, background: p.color, outline: newPalette === i ? `3px solid ${p.color}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="b" style={s.saveBtn} onClick={createProfile}>Add child</button>
                  <button className="b" style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="b" style={s.addBtn} onClick={() => setShowForm(true)}>+ add a child</button>
            )}

            {state.profiles.length >= 2 && (
              <button className="b" style={s.cmpBtn}
                onClick={() => { setCompareId(state.profiles[0].id); setCompareA(null); setCompareB(null); setView("compare"); }}>
                ⟷ compare days
              </button>
            )}
          </div>
        )}

        {/* LOG */}
        {view === "log" && active && (
          <div className="f" style={s.sec}>
            <div style={s.secHead}>
              <span style={{ fontSize: 22 }}>{active.emoji}</span>
              <div>
                <h2 style={s.secTitle}>{editingEntryId ? "Edit entry" : "Log a day"} for {active.name}</h2>
                {getAge(active.birthdate, logDate) && (
                  <div style={{ color: active.color, fontSize: 13, marginTop: 3, fontStyle: "italic" }}>
                    {getAge(active.birthdate, logDate)} on this day
                  </div>
                )}
              </div>
            </div>
            <div style={s.form}>
              <label style={s.lbl}>Date</label>
              <input type="date" value={logDate} max={today()}
                onChange={(e) => setLogDate(e.target.value)} style={s.inp} />
              <label style={s.lbl}>Photo</label>
              {logPreview ? (
                <div style={s.prevWrap}>
                  <img src={logPreview} alt="preview" style={s.prev} />
                  <button className="b" style={s.remBtn}
                    onClick={() => { setLogPhoto(null); setLogPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>remove</button>
                </div>
              ) : (
                <div className="b" style={s.drop} onClick={() => fileRef.current.click()}>
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span style={{ color: "#bbb", fontSize: 13, marginTop: 5 }}>tap to choose a photo</span>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
                </div>
              )}
              <label style={s.lbl}>Note <span style={{ color: "#ccc", fontWeight: 300 }}>(optional)</span></label>
              <textarea value={logNote} onChange={(e) => setLogNote(e.target.value)}
                placeholder="Said a new word. Laughed at the dog. Wouldn't eat dinner again."
                style={s.ta} rows={3} />
              <button className="b" style={{ ...s.saveBtn, background: active.color }} onClick={saveEntry}>
                {editingEntryId ? "Update entry" : "Save this entry"}
              </button>
              {editingEntryId && (
                <button className="b" style={s.cancelBtn} onClick={() => { resetLogForm(); setView("timeline"); }}>
                  Cancel editing
                </button>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {view === "timeline" && active && (
          <div className="f" style={s.sec}>
            <div style={s.secHead}>
              <div style={{ flex: 1 }}>
                <div style={s.tabs}>
                  {state.profiles.map((p) => (
                    <button key={p.id} className="b" onClick={() => setActiveId(p.id)}
                      style={{ ...s.tab, background: activeId === p.id ? p.color : "transparent",
                        color: activeId === p.id ? "#fff" : "#888", borderColor: activeId === p.id ? p.color : "#ddd" }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <button className="b" style={{ ...s.btn1, background: active.color, marginTop: 10 }}
                onClick={() => goLog(activeId)}>+ add entry</button>
            </div>
            {sorted.length === 0 ? (
              <div style={s.empty}><span style={{ fontSize: 36 }}>📷</span><p>No days logged yet.</p></div>
            ) : (
              <div style={s.tl}>
                {sorted.map((e) => (
                  <div key={e.id} className="c" style={s.eCard}>
                    <div style={s.ePhotoWrap}>
                      <img src={e.photo} alt={e.date} style={s.ePhoto} />
                    </div>
                    <div style={s.eInfo}>
                      <div style={{ ...s.eDate, color: active.color }}>{formatDate(e.date)}</div>
                      {getAge(active.birthdate, e.date) && (
                        <div style={s.eAge}>{getAge(active.birthdate, e.date)}</div>
                      )}
                      {e.note && <div style={s.eNote}>{e.note}</div>}
                      <button className="b" style={{ ...s.editBtn, color: active.color }} onClick={() => editEntry(e)}>edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPARE */}
        {view === "compare" && (
          <div className="f" style={s.sec}>
            <h2 style={{ ...s.secTitle, marginBottom: 14 }}>Compare days</h2>
            <div style={s.tabs}>
              {state.profiles.map((p) => (
                <button key={p.id} className="b"
                  onClick={() => { setCompareId(p.id); setCompareA(null); setCompareB(null); }}
                  style={{ ...s.tab, background: compareId === p.id ? p.color : "transparent",
                    color: compareId === p.id ? "#fff" : "#888", borderColor: compareId === p.id ? p.color : "#ddd" }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
            {(() => {
              const cp = state.profiles.find((p) => p.id === compareId);
              const cpe = compareId ? [...(state.entries[compareId] || [])].sort((a, b) => b.date.localeCompare(a.date)) : [];
              return (
                <div style={{ ...s.cmpGrid, marginTop: 18 }}>
                  {[{ sel: compareA, set: setCompareA, lbl: "Day A" }, { sel: compareB, set: setCompareB, lbl: "Day B" }].map(({ sel, set, lbl }) => (
                    <div key={lbl} style={s.cmpCol}>
                      <div style={s.cmpLbl}>{lbl}</div>
                      {sel ? (
                        <div style={s.cmpCard}>
                          <img src={sel.photo} alt={sel.date} style={s.cmpPhoto} />
                          <div style={{ padding: "8px 10px 4px" }}>
                            <div style={{ fontFamily: "'Lora',serif", fontSize: 14, fontWeight: 600, color: cp?.color }}>{formatDate(sel.date)}</div>
                            {cp && getAge(cp.birthdate, sel.date) && (
                              <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 }}>{getAge(cp.birthdate, sel.date)}</div>
                            )}
                            {sel.note && <div style={{ fontSize: 13, color: "#777", marginTop: 3, lineHeight: 1.4 }}>{sel.note}</div>}
                          </div>
                          <button className="b" style={s.chgBtn} onClick={() => set(null)}>change</button>
                        </div>
                      ) : (
                        <div style={s.cmpPicker}>
                          <p style={{ color: "#bbb", fontSize: 13, marginBottom: 8 }}>Pick a day</p>
                          {cpe.length === 0 && <p style={{ color: "#ddd", fontSize: 13 }}>No entries yet</p>}
                          <div style={s.cmpList}>
                            {cpe.map((e) => (
                              <button key={e.id} className="b" onClick={() => set(e)}
                                style={{ ...s.cmpItem, borderColor: (cp?.color || "#ccc") + "33" }}>
                                <img src={e.photo} alt={e.date} style={s.cmpThumb} />
                                <span style={{ fontSize: 13, color: "#555", textAlign: "left", lineHeight: 1.4 }}>
                                  {formatDate(e.date)}
                                  {cp && getAge(cp.birthdate, e.date) && (
                                    <span style={{ display: "block", color: "#bbb", fontSize: 12 }}>{getAge(cp.birthdate, e.date)}</span>
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </main>

      <nav style={s.nav}>
        {[{ id: "home", icon: "⌂", lbl: "Home" }, { id: "log", icon: "+", lbl: "Log" },
          { id: "timeline", icon: "◫", lbl: "Timeline" }, { id: "compare", icon: "⟷", lbl: "Compare" }].map((n) => (
          <button key={n.id} className="b"
            style={{ ...s.navItem, color: view === n.id ? "#1a1a1a" : "#ccc",
              borderTop: view === n.id ? "2px solid #1a1a1a" : "2px solid transparent" }}
            onClick={() => {
              if (n.id === "log") {
                if (!activeId && state.profiles.length > 0) setActiveId(state.profiles[0].id);
                resetLogForm();
              }
              if (n.id === "timeline" && !activeId && state.profiles.length > 0) setActiveId(state.profiles[0].id);
              if (n.id === "compare" && state.profiles.length > 0) { setCompareId(state.profiles[0].id); setCompareA(null); setCompareB(null); }
              setView(n.id);
            }}>
            <span style={{ fontSize: 17 }}>{n.icon}</span>
            <span style={{ fontSize: 12, marginTop: 2 }}>{n.lbl}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const s = {
  root: { fontFamily: "'DM Sans',sans-serif", background: "#FAF8F5", minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" },
  hdr: { background: "#FAF8F5", borderBottom: "1px solid #EDEAE4", padding: "13px 20px", position: "sticky", top: 0, zIndex: 10 },
  hdrIn: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "baseline" },
  logoZ: { fontFamily: "'Lora',serif", fontStyle: "italic", fontSize: 26, color: "#1a1a1a", lineHeight: 1 },
  logoR: { fontFamily: "'Lora',serif", fontSize: 22, color: "#1a1a1a", fontWeight: 400, letterSpacing: "-0.5px" },
  back: { background: "none", border: "none", fontSize: 14, color: "#999", fontFamily: "'DM Sans',sans-serif", padding: "4px 0", cursor: "pointer" },
  main: { flex: 1, paddingBottom: 80, overflowY: "auto" },
  toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "10px 20px", borderRadius: 100, fontSize: 14, zIndex: 100, whiteSpace: "nowrap" },

  home: { padding: "24px 20px 20px" },
  tagline: { fontFamily: "'Lora',serif", fontStyle: "italic", color: "#888", fontSize: 16, marginBottom: 24, letterSpacing: "-0.2px" },
  emptyHome: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "36px 20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  card: { background: "#fff", borderRadius: 16, border: "1.5px solid", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  avt: { width: 66, height: 66, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avtImg: { width: "100%", height: "100%", objectFit: "cover" },
  pName: { fontFamily: "'Lora',serif", fontSize: 16, color: "#1a1a1a", fontWeight: 600, marginTop: 2 },
  pAge: { fontSize: 13, fontWeight: 500, textAlign: "center", lineHeight: 1.35 },
  pCount: { fontSize: 13, color: "#aaa" },
  pActions: { display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 6 },
  btn1: { padding: "9px 14px", borderRadius: 100, border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center" },
  btn2: { padding: "9px 14px", borderRadius: 100, border: "1.5px solid", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "center" },
  addBtn: { width: "100%", padding: "12px", background: "#fff", border: "1.5px dashed #ddd", borderRadius: 12, fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 10 },
  cmpBtn: { width: "100%", padding: "12px", background: "#fff", border: "1.5px solid #EDEAE4", borderRadius: 12, fontSize: 14, color: "#555", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

  formCard: { background: "#fff", border: "1.5px solid #EDEAE4", borderRadius: 16, padding: "18px 16px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 11 },
  formTitle: { fontFamily: "'Lora',serif", fontSize: 17, color: "#1a1a1a", fontWeight: 600 },
  emojiRow: { display: "flex", gap: 8 },
  emojiBtn: { width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" },
  palRow: { display: "flex", gap: 10 },
  palDot: { width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer" },
  saveBtn: { flex: 1, padding: "12px", borderRadius: 10, border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: "#1a1a1a" },
  cancelBtn: { flex: 1, padding: "12px", background: "#f0ede8", border: "none", borderRadius: 10, fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

  sec: { padding: "22px 20px" },
  secHead: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 },
  secTitle: { fontFamily: "'Lora',serif", fontSize: 19, color: "#1a1a1a", fontWeight: 600 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  tab: { padding: "7px 14px", borderRadius: 100, border: "1.5px solid", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 },
  lbl: { fontSize: 12, color: "#999", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: 500, marginBottom: -5 },
  inp: { padding: "12px 14px", borderRadius: 10, border: "1.5px solid #EDEAE4", fontSize: 16, background: "#fff", color: "#1a1a1a", fontFamily: "'DM Sans',sans-serif", width: "100%" },
  form: { display: "flex", flexDirection: "column", gap: 13 },
  drop: { border: "1.5px dashed #ccc", borderRadius: 12, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", background: "#f7f5f2" },
  prevWrap: { position: "relative", borderRadius: 12, overflow: "hidden" },
  prev: { width: "100%", maxHeight: 250, objectFit: "cover", borderRadius: 12, display: "block" },
  remBtn: { position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.5)", color: "#fff", border: "none", borderRadius: 100, padding: "5px 12px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },
  ta: { padding: "12px 14px", borderRadius: 10, border: "1.5px solid #EDEAE4", fontSize: 16, fontFamily: "'DM Sans',sans-serif", color: "#1a1a1a", background: "#fff", resize: "none", lineHeight: 1.6, width: "100%" },

  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "50px 20px", color: "#bbb", fontSize: 14 },
  tl: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  eCard: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)", display: "flex", flexDirection: "column" },
  ePhotoWrap: { width: "100%", aspectRatio: "3 / 4", background: "#eee", overflow: "hidden" },
  ePhoto: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  eInfo: { padding: "10px 11px 12px", display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  eDate: { fontFamily: "'Lora',serif", fontSize: 15, fontWeight: 600, lineHeight: 1.25 },
  eAge: { fontSize: 12, color: "#aaa", marginTop: 2, fontStyle: "italic", lineHeight: 1.3 },
  eNote: { fontSize: 13, color: "#777", marginTop: 4, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  editBtn: { alignSelf: "flex-start", marginTop: "auto", padding: "5px 0 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" },

  cmpGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  cmpCol: { display: "flex", flexDirection: "column", gap: 8 },
  cmpLbl: { fontSize: 12, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 500 },
  cmpCard: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)" },
  cmpPhoto: { width: "100%", height: 148, objectFit: "cover", display: "block" },
  chgBtn: { background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", padding: "6px 10px 10px", fontFamily: "'DM Sans',sans-serif" },
  cmpPicker: { background: "#fff", borderRadius: 12, padding: 10, minHeight: 150, border: "1.5px dashed #e8e4df" },
  cmpList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" },
  cmpItem: { display: "flex", alignItems: "center", gap: 8, background: "#FAF8F5", border: "1.5px solid", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" },
  cmpThumb: { width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 },

  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#FAF8F5", borderTop: "1px solid #EDEAE4", display: "flex", justifyContent: "space-around", padding: "8px 0 12px", zIndex: 10 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: "6px 16px", gap: 2 },
};
