import { useEffect } from "react";

const BRAND = "Zommy";
const WRONG_BRAND = "ZOOMY";

const normalizeTextNode = (node) => {
  if (!node?.nodeValue?.includes(WRONG_BRAND)) return;
  node.nodeValue = node.nodeValue.replaceAll(WRONG_BRAND, BRAND);
};

const normalizeElement = (element) => {
  if (!(element instanceof HTMLElement)) return;

  ["aria-label", "title", "alt"].forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (value?.includes(WRONG_BRAND)) {
      element.setAttribute(attribute, value.replaceAll(WRONG_BRAND, BRAND));
    }
  });
};

const normalizeBrand = () => {
  document.title = BRAND;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    normalizeTextNode(current);
    current = walker.nextNode();
  }

  document.querySelectorAll("[aria-label], [title], img[alt]").forEach(normalizeElement);
};

export default function BrandConsistencyLayer() {
  useEffect(() => {
    normalizeBrand();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) normalizeTextNode(node);
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          normalizeElement(node);
          node.querySelectorAll?.("*").forEach((child) => {
            normalizeElement(child);
            child.childNodes?.forEach((childNode) => {
              if (childNode.nodeType === Node.TEXT_NODE) normalizeTextNode(childNode);
            });
          });
        });
      });
      normalizeBrand();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "alt"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
