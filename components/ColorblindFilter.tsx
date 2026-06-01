"use client";

import { useEffect } from "react";

const MODES = ["deuteranopia", "protanopia", "tritanopia"] as const;
type Mode = (typeof MODES)[number];

function apply(mode: string | null) {
  const cls = document.body.classList;
  for (const m of MODES) cls.remove(`cb-${m}`);
  if (mode && (MODES as readonly string[]).includes(mode)) {
    cls.add(`cb-${mode as Mode}`);
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

    window.addEventListener("storage", onStorage);
    window.addEventListener("rv-colorblind-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rv-colorblind-change", onCustom);
    };
  }, []);

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        pointerEvents: "none",
        filter: "none",
        WebkitFilter: "none",
      }}
    >
      <defs>
        <filter id="cb-deuteranopia" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0    0 0
                    0.7   0.3   0    0 0
                    0     0.3   0.7  0 0
                    0     0     0    1 0"
          />
        </filter>
        <filter id="cb-protanopia" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.567 0.433 0     0 0
                    0.558 0.442 0     0 0
                    0     0.242 0.758 0 0
                    0     0     0     1 0"
          />
        </filter>
        <filter id="cb-tritanopia" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.95  0.05  0     0 0
                    0     0.433 0.567 0 0
                    0     0.475 0.525 0 0
                    0     0     0     1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
