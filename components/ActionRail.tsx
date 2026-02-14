"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { useResponsive } from "@/lib/useResponsive";

export type ActionItem = {
  icon: IconDefinition;
  count?: number;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
};

export function ActionRail({ items, disabled }: { items: ActionItem[]; disabled?: boolean }) {
  const r = useResponsive();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: r.breakpoint === "medium" ? 2 : 4 }}>
      {items.map((item, i) => (
        <RoundBtn key={i} {...item} disabled={disabled || item.disabled} size={r.actionRailSize} />
      ))}
    </div>
  );
}

function RoundBtn({ icon, count, active, activeColor = "#ff3b5c", disabled, onClick, size }: ActionItem & { size: number }) {
  const color = active ? activeColor : "white";
  const badgeSize = Math.round(size * 0.35);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(e); }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        ...(disabled ? { opacity: 0.4, pointerEvents: "none" as const } : {}),
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "black",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          position: "relative",
          border: `1px solid ${active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)"}`,
          ...(active ? { boxShadow: `0 0 12px ${activeColor}44` } : {}),
        }}
      >
        <FontAwesomeIcon icon={icon} style={{ fontSize: Math.round(size * 0.38), color }} />
        {count != null && count > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            background: active ? activeColor : "rgba(255,255,255,0.85)",
            color: active ? "white" : "black",
            fontSize: Math.round(size * 0.19),
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
