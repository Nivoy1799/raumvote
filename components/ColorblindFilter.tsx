"use client";

import { useEffect } from "react";

const MODES = ["deuteranopia", "protanopia", "tritanopia"] as const;
type Mode = (typeof MODES)[number];

function apply(mode: string | null) {
  const validMode = mode && (MODES as readonly string[]).includes(mode) ? (mode as Mode) : null;
  const value = validMode ? `url(#cb-${validMode})` : "";
  const children = document.body.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i] as HTMLElement;
    if (el.tagName.toLowerCase() === "svg") continue;
    if (el.dataset.cbSkip === "true") continue;
    el.style.filter = value;
    (el.style as CSSStyleDeclaration & { webkitFilter: string }).webkitFilter = value;
  }
}

export default function ColorblindFilter() {
  useEffect(() => {
    apply(localStorage.getItem("rv-colorblind-mode"));

    const onStorage = (e: StorageEvent) => {
      if (e.key === "rv-colorblind-mode") apply(e.newValue);
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: string }>).detail;
      apply(detail?.mode ?? null);
    };

    const mo = new MutationObserver(() => apply(localStorage.getItem("rv-colorblind-mode")));
    mo.observe(document.body, { childList: true });

    window.addEventListener("storage", onStorage);
    window.addEventListener("rv-colorblind-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rv-colorblind-change", onCustom);
      mo.disconnect();
    };
  }, []);

  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="1"
      height="1"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <defs>
        <filter id="cb-deuteranopia" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0" />
        </filter>
        <filter id="cb-protanopia" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0" />
        </filter>
        <filter id="cb-tritanopia" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0" />
        </filter>
      </defs>
    </svg>
  );
}
