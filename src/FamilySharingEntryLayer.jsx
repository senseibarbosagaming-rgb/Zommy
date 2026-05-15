import { useEffect, useMemo, useState } from "react";

const COPY = {
  en: {
    title: "Family sharing",
    body: "Invite another parent to share memories, timeline, and chapters.",
  },
  pt: {
    title: "Partilha familiar",
    body: "Convida outro pai/mãe para partilhar memórias, timeline e capítulos.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const rowStyle = () => ({
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "16px",
  padding: "14px",
  minHeight: "70px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "Inter, system-ui, sans-serif",
  width: "100%",
});

const addIntegratedRow = (copy) => {
  const settingsTitle = Array.from(document.querySelectorAll("h1")).find((node) => /settings|definições/i.test(node.textContent || ""));
  if (!settingsTitle) return;

  const container = settingsTitle.closest("div")?.parentElement?.querySelector("section");
  if (!container || document.getElementById("zommy-family-sharing-settings-row")) return;

  const row = document.createElement("button");
  row.id = "zommy-family-sharing-settings-row";
  row.type = "button";
  Object.assign(row.style, rowStyle());
  row.innerHTML = `
    <span style="min-width:0;display:block;">
      <span style="display:block;color:#fff;font-size:15px;font-weight:900;">${copy.title}</span>
      <span style="display:block;color:rgba(255,255,255,0.52);font-size:12px;margin-top:3px;font-weight:750;line-height:1.35;">${copy.body}</span>
    </span>
    <span style="color:rgba(255,255,255,0.42);font-size:20px;">›</span>
  `;
  row.addEventListener("click", () => window.dispatchEvent(new CustomEvent("zommy:show-family-sharing")));

  const rows = Array.from(container.children);
  const privacyCard = rows.find((child) => /privacy|privacidade/i.test(child.textContent || ""));
  const oldFamilyInfo = rows.find((child) => /family sharing|partilha familiar/i.test(child.textContent || ""));

  if (oldFamilyInfo && oldFamilyInfo !== row) oldFamilyInfo.remove();
  if (privacyCard?.nextSibling) container.insertBefore(row, privacyCard.nextSibling);
  else container.appendChild(row);
};

const removeIntegratedRow = () => {
  document.getElementById("zommy-family-sharing-settings-row")?.remove();
};

export default function FamilySharingEntryLayer() {
  const [active, setActive] = useState(false);
  const copy = useMemo(() => COPY[getPrefs().lang === "pt" ? "pt" : "en"] || COPY.en, []);

  useEffect(() => {
    const show = () => setActive(true);
    const hide = () => {
      setActive(false);
      removeIntegratedRow();
    };

    window.addEventListener("zommy:show-settings", show);
    window.addEventListener("zommy:hide-settings", hide);
    window.addEventListener("zommy:show-family-sharing", hide);
    window.addEventListener("zommy:show-today", hide);
    window.addEventListener("zommy:show-timeline", hide);
    window.addEventListener("zommy:show-compare", hide);

    return () => {
      window.removeEventListener("zommy:show-settings", show);
      window.removeEventListener("zommy:hide-settings", hide);
      window.removeEventListener("zommy:show-family-sharing", hide);
      window.removeEventListener("zommy:show-today", hide);
      window.removeEventListener("zommy:show-timeline", hide);
      window.removeEventListener("zommy:show-compare", hide);
      removeIntegratedRow();
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const inject = () => addIntegratedRow(copy);
    inject();
    const observer = new MutationObserver(inject);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active, copy]);

  return null;
}
