"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "small" | "medium" | "large";

export interface ResponsiveValues {
  breakpoint: Breakpoint;
  isLandscape: boolean;
  maxWidth: string;
  tabbarHeight: number;
  actionRailSize: number;
  fontSize: {
    title: number;
    body: number;
    button: number;
    small: number;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
}

const CONFIGS: Record<Breakpoint, Omit<ResponsiveValues, "breakpoint" | "isLandscape">> = {
  small: {
    maxWidth: "min(560px, 100vw)",
    tabbarHeight: 64,
    actionRailSize: 52,
    fontSize: { title: 19, body: 14, button: 14, small: 12 },
    spacing: { small: 8, medium: 16, large: 24 },
    borderRadius: { small: 14, medium: 18, large: 22 },
  },
  medium: {
    maxWidth: "100vw",
    tabbarHeight: 44,
    actionRailSize: 48,
    fontSize: { title: 16, body: 13, button: 14, small: 11 },
    spacing: { small: 6, medium: 10, large: 16 },
    borderRadius: { small: 10, medium: 14, large: 18 },
  },
  large: {
    maxWidth: "min(1400px, 100vw)",
    tabbarHeight: 80,
    actionRailSize: 70,
    fontSize: { title: 28, body: 18, button: 18, small: 14 },
    spacing: { small: 12, medium: 24, large: 36 },
    borderRadius: { small: 18, medium: 24, large: 32 },
  },
};

function detect(w: number, h: number): { breakpoint: Breakpoint; isLandscape: boolean } {
  const isLandscape = w > h;
  if (w >= 1080) return { breakpoint: "large", isLandscape };
  if (isLandscape && h < 500 && w >= 560) return { breakpoint: "medium", isLandscape };
  return { breakpoint: "small", isLandscape };
}

export function useResponsive(): ResponsiveValues {
  // Always start with "small" on both server and client to avoid hydration mismatch.
  // The useEffect below will immediately correct to the real breakpoint after mount.
  const [values, setValues] = useState<ResponsiveValues>({
    breakpoint: "small",
    isLandscape: false,
    ...CONFIGS.small,
  });

  useEffect(() => {
    function update() {
      const { breakpoint, isLandscape } = detect(window.innerWidth, window.innerHeight);
      setValues((prev) => {
        if (prev.breakpoint === breakpoint && prev.isLandscape === isLandscape) return prev;
        return { breakpoint, isLandscape, ...CONFIGS[breakpoint] };
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return values;
}
