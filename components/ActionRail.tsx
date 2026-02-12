"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export type ActionItem = {
  icon: IconDefinition;
  count?: number;
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

function RoundBtn({ icon, count, active, activeColor = "#ff3b5c", onClick }: ActionItem) {
  const color = active ? activeColor : "white";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      style={btnWrap}
    >
      <div
        style={{
          ...circle,
          position: "relative",
          border: `1px solid ${active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)"}`,
          ...(active ? { boxShadow: `0 0 12px ${activeColor}44` } : {}),
        }}
      >
        <FontAwesomeIcon icon={icon} style={{ fontSize: 20, color }} />
        {count != null && count > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: active ? activeColor : "rgba(255,255,255,0.85)",
            color: active ? "white" : "black",
            fontSize: 10,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
          }}>
            {count}
          </span>
        )}
      </div>
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
  width: 52,
  height: 52,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.4)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};
