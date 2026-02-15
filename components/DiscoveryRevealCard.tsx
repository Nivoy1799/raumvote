"use client";

import { useEffect, useState } from "react";
import { useResponsive } from "@/lib/useResponsive";

type Props = {
  titel: string;
  beschreibung: string;
  context: string;
  isFirstExplorer: boolean;
  onExplore: () => void;
  onLater: () => void;
};

export function DiscoveryRevealCard({ titel, beschreibung, context, isFirstExplorer, onExplore, onLater }: Props) {
  const r = useResponsive();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isLrg = r.breakpoint === "large";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "grid",
        placeItems: "center",
        background: show ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
        backdropFilter: show ? "blur(6px)" : "blur(0px)",
        transition: "background 500ms ease, backdrop-filter 500ms ease",
      }}
      onClick={onLater}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          color: "black",
          borderRadius: r.borderRadius.large,
          padding: isLrg ? 32 : 24,
          maxWidth: isLrg ? 420 : 340,
          width: "calc(100% - 40px)",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
          transition: "opacity 600ms ease, transform 600ms ease",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: r.fontSize.title + 6,
            fontWeight: 950,
            letterSpacing: -0.5,
            opacity: show ? 1 : 0,
            transition: "opacity 400ms ease 800ms",
          }}
        >
          {titel}
        </div>

        {/* Badge */}
        {isFirstExplorer && (
          <div
            style={{
              marginTop: 10,
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(96,165,250,0.15)",
              color: "#2563eb",
              fontSize: r.fontSize.small,
              fontWeight: 800,
              opacity: show ? 1 : 0,
              transition: "opacity 400ms ease 1000ms",
            }}
          >
            First explorer
          </div>
        )}

        {/* "New path unlocked" badge */}
        <div
          style={{
            marginTop: isFirstExplorer ? 8 : 10,
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.06)",
            color: "rgba(0,0,0,0.7)",
            fontSize: r.fontSize.small,
            fontWeight: 700,
            opacity: show ? 1 : 0,
            transition: "opacity 400ms ease 1000ms",
          }}
        >
          New path unlocked.
        </div>

        {/* Beschreibung */}
        <div
          style={{
            marginTop: 14,
            fontSize: r.fontSize.body,
            fontWeight: 700,
            opacity: show ? 0.85 : 0,
            transition: "opacity 400ms ease 1200ms",
            lineHeight: 1.4,
          }}
        >
          {beschreibung}
        </div>

        {/* Context */}
        <div
          style={{
            marginTop: 10,
            fontSize: r.fontSize.small,
            opacity: show ? 0.6 : 0,
            transition: "opacity 400ms ease 1400ms",
            lineHeight: 1.45,
          }}
        >
          {context}
        </div>

        {/* Buttons */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 10,
            opacity: show ? 1 : 0,
            transition: "opacity 400ms ease 1600ms",
          }}
        >
          <button
            onClick={onExplore}
            style={{
              flex: 1,
              padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
              borderRadius: r.borderRadius.small,
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: r.fontSize.body,
            }}
          >
            Explore
          </button>
          <button
            onClick={onLater}
            style={{
              flex: 1,
              padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
              borderRadius: r.borderRadius.small,
              background: "transparent",
              color: "black",
              border: "1px solid rgba(0,0,0,0.15)",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: r.fontSize.body,
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
