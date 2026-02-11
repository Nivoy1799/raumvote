"use client";

import { useRef } from "react";

type Choice = "left" | "right";

export function useSwipeChoice(opts: {
  onChoice: (choice: Choice) => void;
  thresholdPx?: number;
  lockIfVerticalScroll?: boolean;
}) {
  const { onChoice, thresholdPx = 70, lockIfVerticalScroll = true } = opts;

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

    if (lockIfVerticalScroll && decidedAxis.current === "y") {
      // allow normal vertical scrolling behavior
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

    if (lockIfVerticalScroll && Math.abs(dy) > Math.abs(dx)) return;

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
