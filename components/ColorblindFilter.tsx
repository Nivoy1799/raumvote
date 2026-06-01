"use client";

import { useEffect } from "react";

const MODES = ["deuteranopia", "protanopia", "tritanopia"] as const;
type Mode = (typeof MODES)[number];

// Brettel/Viénot/Mollon 1997 matrices, applied in linearRGB.
// Single-matrix approximation; accurate enough for UI demonstration.
const MATRICES: Record<Mode, string> = {
  deuteranopia: "0.367 0.861 -0.228 0 0 0.280 0.673 0.047 0 0 -0.012 0.043 0.969 0 0 0 0 0 1 0",
  protanopia: "0.152 1.053 -0.205 0 0 0.115 0.786 0.099 0 0 -0.004 -0.048 1.052 0 0 0 0 0 1 0",
  tritanopia: "1.255 -0.077 -0.178 0 0 -0.078 0.931 0.148 0 0 0.005 0.691 0.304 0 0 0 0 0 1 0",
};

function filterValue(mode: Mode): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'><filter id='f' color-interpolation-filters='linearRGB'><feColorMatrix type='matrix' values='${MATRICES[mode]}'/></filter></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}#f")`;
}

function apply(mode: string | null) {
  const validMode = mode && (MODES as readonly string[]).includes(mode) ? (mode as Mode) : null;
  const value = validMode ? filterValue(validMode) : "";
  const children = document.body.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i] as HTMLElement;
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

  return null;
}
