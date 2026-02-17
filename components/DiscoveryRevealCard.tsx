"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
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

/* ── Reduced-motion detection ── */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ── Variant config ── */

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
    blurDuration: 1.5,
    staggerDelay: 0.2,
    extraLine: null,
    gradientFallback:
      "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  },
  visited: {
    badgeText: "Bekannter Pfad",
    badgeBg: "rgba(255,255,255,0.12)",
    badgeColor: "rgba(255,255,255,0.7)",
    blurDuration: 0.8,
    staggerDelay: 0.12,
    extraLine: null,
    gradientFallback:
      "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  },
  rare: {
    badgeText: "Seltener Pfad",
    badgeBg: "rgba(168,85,247,0.3)",
    badgeColor: "#c4b5fd",
    blurDuration: 2.2,
    staggerDelay: 0.25,
    extraLine: "Ein verborgener Pfad",
    gradientFallback:
      "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
  },
};

/* ── Component ── */

export function DiscoveryRevealCard({
  node,
  variant,
  totalPaths,
  onExplore,
  onLater,
}: Props) {
  const r = useResponsive();
  const reducedMotion = usePrefersReducedMotion();
  const [descExpanded, setDescExpanded] = useState(false);
  const [exiting, setExiting] = useState<"explore" | "later" | null>(null);
  const config = VARIANT_CONFIG[variant];

  const hasImage =
    !!node.mediaUrl && node.mediaUrl !== "/media/placeholder.jpg";

  // Truncation
  const descPreview =
    node.beschreibung.length > 80
      ? node.beschreibung.slice(0, 80) + "..."
      : node.beschreibung;
  const canExpand = node.beschreibung.length > 80;

  // Animation timing
  const baseDelay = reducedMotion ? 0 : 0.3;
  const stagger = reducedMotion ? 0 : config.staggerDelay;

  // Swipe gesture
  const y = useMotionValue(0);
  const contentOpacity = useTransform(y, [-150, 0, 150], [0.5, 1, 0.5]);
  const bgScale = useTransform(y, [-200, 0, 200], [1.05, 1, 0.97]);

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onLater();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onLater]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (exiting) return;
      if (info.offset.y < -80 && info.velocity.y < 0) {
        setExiting("explore");
      } else if (info.offset.y > 80 && info.velocity.y > 0) {
        setExiting("later");
      }
    },
    [exiting],
  );

  const handleAnimationComplete = useCallback(() => {
    if (exiting === "explore") onExplore();
    else if (exiting === "later") onLater();
  }, [exiting, onExplore, onLater]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${config.badgeText}: ${node.titel}`}
      initial={{ opacity: 0 }}
      animate={
        exiting
          ? { opacity: 0, transition: { duration: 0.3 } }
          : { opacity: 1, transition: { duration: 0.4 } }
      }
      onAnimationComplete={exiting ? handleAnimationComplete : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        overflow: "hidden",
        background: "black",
      }}
    >
      {/* ── Background image with blur animation ── */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          scale: bgScale,
        }}
        initial={
          reducedMotion ? {} : { filter: "blur(20px)", scale: 1.1 }
        }
        animate={
          reducedMotion
            ? {}
            : {
                filter: "blur(2px)",
                scale: 1,
                transition: {
                  duration: config.blurDuration,
                  ease: "easeOut",
                },
              }
        }
      >
        {hasImage ? (
          <Image
            src={node.mediaUrl!}
            alt=""
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: config.gradientFallback,
            }}
          />
        )}
      </motion.div>

      {/* ── Dark gradient overlay ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.3) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Draggable content (bottom-aligned) ── */}
      <motion.div
        drag={reducedMotion ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: r.spacing.medium,
          paddingBottom: r.tabbarHeight + 20,
          opacity: contentOpacity,
          y,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: r.breakpoint === "large" ? 600 : undefined,
          margin: r.breakpoint === "large" ? "0 auto" : undefined,
          touchAction: "none",
        }}
        animate={
          exiting === "explore"
            ? { y: "-100%", opacity: 0 }
            : exiting === "later"
              ? { y: "30%", opacity: 0 }
              : {}
        }
        transition={exiting ? { duration: 0.3, ease: "easeIn" } : undefined}
      >
        {/* Badge */}
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: baseDelay, duration: 0.4 }}
          style={{
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
          }}
        >
          {variant === "new" && "\u2605 "}
          {config.badgeText}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: baseDelay + stagger,
            duration: 0.5,
            type: reducedMotion ? "tween" : "spring",
            damping: 20,
            stiffness: 200,
          }}
          style={{
            fontSize: r.fontSize.title + 8,
            fontWeight: 950,
            color: "white",
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          {node.titel}
        </motion.div>

        {/* Extra line (rare variant) */}
        {config.extraLine && (
          <motion.div
            initial={reducedMotion ? { opacity: 0.7 } : { opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{
              delay: baseDelay + stagger * 1.5,
              duration: 0.6,
            }}
            style={{
              fontSize: r.fontSize.body,
              fontWeight: 600,
              color: config.badgeColor,
              fontStyle: "italic",
            }}
          >
            {config.extraLine}
          </motion.div>
        )}

        {/* Progress */}
        <motion.div
          initial={reducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: baseDelay + stagger * 2, duration: 0.5 }}
          style={{
            fontSize: r.fontSize.small,
            color: "white",
            fontWeight: 600,
          }}
        >
          Tiefe {node.depth}
          {totalPaths ? ` \u00b7 ${totalPaths} Pfade entdeckt` : ""}
        </motion.div>

        {/* Description (collapsible) */}
        <motion.div
          initial={reducedMotion ? { opacity: 0.8 } : { opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: baseDelay + stagger * 3, duration: 0.5 }}
        >
          <div
            style={{
              fontSize: r.fontSize.body,
              color: "white",
              lineHeight: 1.5,
              overflow: "hidden",
            }}
          >
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
        </motion.div>

        {/* Swipe hint */}
        {!reducedMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.4, 0] }}
            transition={{
              delay: baseDelay + stagger * 5,
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M12 4l-6 6h12l-6-6z" fill="white" />
            </svg>
            Nach oben wischen
          </motion.div>
        )}

        {/* "Später erkunden" button */}
        <motion.button
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + stagger * 4, duration: 0.4 }}
          onClick={onLater}
          style={{
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
          Sp\u00e4ter erkunden
        </motion.button>

        {/* Visually hidden explore button for screen readers / keyboard */}
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
      </motion.div>
    </motion.div>
  );
}
