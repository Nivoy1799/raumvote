"use client";

import { ReactNode } from "react";
import { useResponsive } from "@/lib/useResponsive";

export function PageWrapper({ children }: { children: ReactNode }) {
  const r = useResponsive();

  return (
    <div
      style={{
        minHeight: "100dvh",
        paddingBottom: `calc(${r.tabbarHeight}px + env(safe-area-inset-bottom) + ${r.spacing.medium}px)`,
      }}
    >
      {children}
    </div>
  );
}
