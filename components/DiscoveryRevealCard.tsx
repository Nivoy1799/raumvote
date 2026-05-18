"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { TreeNodeData } from "@/lib/tree.types";
import { useResponsive } from "@/lib/useResponsive";

export type DiscoveryVariant = "new" | "visited" | "rare";

type Props = {
  node: TreeNodeData;
  variant: DiscoveryVariant;
  totalPaths?: number;
  onExplore: () => void;
  onLater: () => void;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

const VARIANT_CONFIG: Record<
  DiscoveryVariant,
  {
    badgeText: string;
    badgeBg: string;
    badgeColor: string;
    blurDuration: number;
    staggerDelay: number;
    extraLine: string | null;
    gradientFallback: string;
  }
> = {
  new: {
    badgeText: "Neuer Pfad entdeckt",
    badgeBg: "rgba(96,165,250,0.25)",
    badgeColor: "#93c5fd",
    blurDuration: 1500,
    staggerDelay: 200,
    extraLine: null,
    gradientFallback: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  },
  visited: {
    badgeText: "Bekannter Pfad",
    badgeBg: "rgba(255,255,255,0.12)",
    badgeColor: "rgba(255,255,255,0.7)",
    blurDuration: 800,
    staggerDelay: 120,
    extraLine: null,
    gradientFallback: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  },
  rare: {
    badgeText: "Seltener Pfad",
    badgeBg: "rgba(168,85,247,0.3)",
    badgeColor: "#c4b5fd",
    blurDuration: 2200,
    staggerDelay: 250,
    extraLine: "Ein verborgener Pfad",
    gradientFallback: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
  },
};

export function DiscoveryRevealCard({ node, variant, totalPaths, onExplore, onLater }: Props) {
  const r = useResponsive();
  const reducedMotion = usePrefersReducedMotion();
  const [descExpanded, setDescExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const [exiting, setExiting] = useState<"explore" | "later" | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const config = VARIANT_CONFIG[variant];

  const dragRef = useRef<{ startY: number; active: boolean }>({ startY: 0, active: false });

  const hasImage = !!node.mediaUrl && node.mediaUrl !== "/media/placeholder.jpg";
  const descPreview = node.beschreibung.length > 80 ? node.beschreibung.slice(0, 80) + "..." : node.beschreibung;
  const canExpand = node.beschreibung.length > 80;

  const baseDelay = reducedMotion ? 0 : 300;
  const stagger = reducedMotion ? 0 : config.staggerDelay;

  // Trigger mount fade-in
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const t = setTimeout(() => setBgReady(true), reducedMotion ? 0 : config.blurDuration);
    return () => clearTimeout(t);
  }, [reducedMotion, config.blurDuration]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (exiting) return;
      if (e.key === "Enter" || e.key === "ArrowUp") {
        e.preventDefault();
        setExiting("explore");
      } else if (e.key === "Escape" || e.key === "ArrowDown") {
        e.preventDefault();
        setExiting("later");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [exiting]);

  // After exit transition completes
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => {
      if (exiting === "explore") onExplore();
      else onLater();
    }, 300);
    return () => clearTimeout(t);
  }, [exiting, onExplore, onLater]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (reducedMotion || exiting) return;
      dragRef.current = { startY: e.clientY, active: true };
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [reducedMotion, exiting],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.active || exiting) return;
      setDragY(e.clientY - dragRef.current.startY);
    },
    [exiting],
  );

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.active || exiting) return;
    dragRef.current.active = false;
    setDragging(false);
    const dy = dragY;
    setDragY(0);
    if (dy < -80) setExiting("explore");
    else if (dy > 80) setExiting("later");
  }, [dragY, exiting]);

  const contentOpacity = exiting ? 0 : Math.max(0.5, 1 - Math.abs(dragY) / 300);

  const exitTranslate =
    exiting === "explore" ? "translateY(-100%)" : exiting === "later" ? "translateY(30%)" : `translateY(${dragY}px)`;

  function fadeIn(delayMs: number, extraStyle?: React.CSSProperties): React.CSSProperties {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(16px)",
      transition: reducedMotion ? "opacity 0.1s" : `opacity 0.5s ease ${delayMs}ms, transform 0.5s ease ${delayMs}ms`,
      ...extraStyle,
    };
  }

  return (
    <>
      {/* Swipe hint keyframes */}
      {!reducedMotion && (
        <style>{`
          @keyframes rv-pulse {
            0%,100% { opacity:0; }
            30%,70% { opacity:0.4; }
          }
          .rv-swipe-hint { animation: rv-pulse 3s ease ${baseDelay + stagger * 5}ms infinite; opacity:0; }
        `}</style>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${config.badgeText}: ${node.titel}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          overflow: "hidden",
          background: "black",
          opacity: exiting ? 0 : mounted ? 1 : 0,
          transition: reducedMotion ? "none" : exiting ? "opacity 0.3s ease" : "opacity 0.4s ease",
        }}
      >
        {/* Background with blur clearing */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: bgReady || reducedMotion ? "blur(2px)" : "blur(20px)",
            transform: bgReady || reducedMotion ? "scale(1)" : "scale(1.1)",
            transition: reducedMotion
              ? "none"
              : `filter ${config.blurDuration}ms ease, transform ${config.blurDuration}ms ease`,
          }}
        >
          {hasImage ? (
            <Image src={node.mediaUrl!} alt="" fill priority style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: config.gradientFallback }} />
          )}
        </div>

        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.3) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Draggable content */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: r.spacing.medium,
            paddingBottom: r.tabbarHeight + 20,
            opacity: contentOpacity,
            transform: exitTranslate,
            transition: exiting ? "transform 0.3s ease, opacity 0.3s ease" : dragging ? "none" : "transform 0.2s ease",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: r.breakpoint === "large" ? 600 : undefined,
            margin: r.breakpoint === "large" ? "0 auto" : undefined,
            touchAction: "none",
            cursor: reducedMotion ? "default" : "grab",
          }}
        >
          {/* Badge */}
          <div
            style={fadeIn(baseDelay, {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              padding: "5px 12px",
              borderRadius: 8,
              background: config.badgeBg,
              color: config.badgeColor,
              fontSize: r.fontSize.small,
              fontWeight: 800,
              letterSpacing: 0.3,
            })}
          >
            {variant === "new" && "★ "}
            {config.badgeText}
          </div>

          {/* Title */}
          <div
            style={fadeIn(baseDelay + stagger, {
              fontSize: r.fontSize.title + 8,
              fontWeight: 950,
              color: "white",
              letterSpacing: -0.5,
              lineHeight: 1.1,
            })}
          >
            {node.titel}
          </div>

          {/* Extra line (rare) */}
          {config.extraLine && (
            <div
              style={fadeIn(baseDelay + stagger * 1.5, {
                fontSize: r.fontSize.body,
                fontWeight: 600,
                color: config.badgeColor,
                fontStyle: "italic",
              })}
            >
              {config.extraLine}
            </div>
          )}

          {/* Progress */}
          <div
            style={fadeIn(baseDelay + stagger * 2, {
              fontSize: r.fontSize.small,
              color: "white",
              fontWeight: 600,
              opacity: mounted ? 0.5 : 0,
            })}
          >
            Tiefe {node.depth}
            {totalPaths ? ` · ${totalPaths} Pfade entdeckt` : ""}
          </div>

          {/* Description */}
          <div style={fadeIn(baseDelay + stagger * 3)}>
            <div style={{ fontSize: r.fontSize.body, color: "white", lineHeight: 1.5, opacity: 0.8 }}>
              {descExpanded ? node.beschreibung : descPreview}
            </div>
            {canExpand && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: r.fontSize.small,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 0",
                  marginTop: 4,
                }}
              >
                {descExpanded ? "Weniger" : "Mehr"}
              </button>
            )}
          </div>

          {/* Swipe hint */}
          {!reducedMotion && (
            <div
              className="rv-swipe-hint"
              aria-hidden="true"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: "white",
                fontSize: r.fontSize.small,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 4l-6 6h12l-6-6z" fill="white" />
              </svg>
              Nach oben wischen / Enter
            </div>
          )}

          {/* Later button */}
          <button
            onClick={onLater}
            style={{
              ...fadeIn(baseDelay + stagger * 4),
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: r.borderRadius.small,
              color: "white",
              fontSize: r.fontSize.body,
              fontWeight: 800,
              padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
              cursor: "pointer",
              alignSelf: "stretch",
              marginTop: 4,
            }}
          >
            Realität erkunden
          </button>

          {/* Hidden explore button for a11y */}
          <button
            onClick={onExplore}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
              padding: 0,
              margin: -1,
            }}
            aria-label="Pfad erkunden"
          >
            Erkunden
          </button>
        </div>
      </div>
    </>
  );
}
