import { useEffect, useMemo, useState } from "react";
import { palette, type } from "./designSystem";

const COPY = {
  en: {
    title: "Family circle",
    body: "Invite another trusted parent to add memories, view the timeline, and help keep this child's story.",
  },
  pt: {
    title: "Círculo familiar",
    body: "Convida outro pai/mãe de confiança para guardar memórias, ver a timeline e ajudar a contar esta história.",
  },
};

const getPrefs = () => {
  try { return JSON.parse(localStorage.getItem("zommy_prefs") || "{}"); }
  catch { return {}; }
};

const rowStyle = () => ({
  border: "none",
  background: palette.surface,
  borderRadius: "16px",
  padding: "14px",
  minHeight: "70px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  color: palette.stone,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: type.sans,
  width: "100%",
  boxShadow: palette.shadow,
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

  const text = document.createElement("span");
  Object.assign(text.style, { minWidth: 0, display: "block" });

  const title = document.createElement("span");
  title.textContent = copy.title;
  Object.assign(title.style, { display: "block", color: palette.stone, fontSize: "15px", fontWeight: type.weight.heading });

  const body = document.createElement("span");
  body.textContent = copy.body;
  Object.assign(body.style, { display: "block", color: palette.muted, fontSize: "12px", marginTop: "3px", fontWeight: type.weight.ui, lineHeight: 1.35 });

  const arrow = document.createElement("span");
  arrow.textContent = "›";
  Object.assign(arrow.style, { color: palette.muted, fontSize: "20px" });

  text.append(title, body);
  row.append(text, arrow);
  row.addEventListener("click", () => window.dispatchEvent(new CustomEvent("zommy:show-family-sharing")));

  const rows = Array.from(container.children);
  const privacyCard = rows.find((child) => /privacy|privacidade/i.test(child.textContent || ""));
  const oldFamilyInfo = rows.find((child) => /family sharing|partilha familiar|family circle|círculo familiar/i.test(child.textContent || ""));

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

    return () => {
      window.removeEventListener("zommy:show-settings", show);
      window.removeEventListener("zommy:hide-settings", hide);
      window.removeEventListener("zommy:show-family-sharing", hide);
      window.removeEventListener("zommy:show-today", hide);
      window.removeEventListener("zommy:show-timeline", hide);
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
