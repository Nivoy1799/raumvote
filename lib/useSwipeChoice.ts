"use client";

import { useRef } from "react";

type Choice = "left" | "right";

export function useSwipeChoice(opts: {
  onChoice: (choice: Choice) => void;
  onSwipeUp?: () => void;
  thresholdPx?: number;
  lockIfVerticalScroll?: boolean;
}) {
  const { onChoice, onSwipeUp, thresholdPx = 70, lockIfVerticalScroll = true } = opts;

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const decidedAxis = useRef<"x" | "y" | null>(null);
  const active = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    active.current = true;
    decidedAxis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!active.current || startX.current == null || startY.current == null) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!decidedAxis.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        decidedAxis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }
    }

    if (lockIfVerticalScroll && decidedAxis.current === "y" && !onSwipeUp) {
      // allow normal vertical scrolling behavior (only if no swipeUp handler)
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!active.current || startX.current == null || startY.current == null) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    active.current = false;
    startX.current = null;
    startY.current = null;

    // Vertical axis dominant — check for upward swipe
    if (Math.abs(dy) > Math.abs(dx)) {
      if (onSwipeUp && dy < -thresholdPx) {
        onSwipeUp();
      }
      return;
    }

    // Horizontal swipe
    if (dx < -thresholdPx) onChoice("left");
    else if (dx > thresholdPx) onChoice("right");
  }

  function bind() {
    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    };
  }

  return { bind };
}
