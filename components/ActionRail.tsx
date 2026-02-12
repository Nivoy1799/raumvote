"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export type ActionItem = {
  icon: IconDefinition;
  label?: string | number;
  active?: boolean;
  activeColor?: string;
  onClick: (e: React.MouseEvent) => void;
};

export function ActionRail({ items }: { items: ActionItem[] }) {
  return (
    <div style={rail}>
      {items.map((item, i) => (
        <RoundBtn key={i} {...item} />
      ))}
    </div>
  );
}

function RoundBtn({ icon, label, active, activeColor = "#ff3b5c", onClick }: ActionItem) {
  const color = active ? activeColor : "white";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      style={btnWrap}
    >
      <div
        style={{
          ...circle,
          border: `1px solid ${active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)"}`,
          ...(active ? { boxShadow: `0 0 12px ${activeColor}44` } : {}),
        }}
      >
        <FontAwesomeIcon icon={icon} style={{ fontSize: 15, color }} />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          color: active ? activeColor : "rgba(255,255,255,0.65)",
          visibility:
            label == null || (typeof label === "number" && label <= 0)
              ? "hidden"
              : "visible",
        }}
      >
        {label ?? "\u00A0"}
      </span>
    </button>
  );
}

const rail: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const btnWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const circle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.4)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};
