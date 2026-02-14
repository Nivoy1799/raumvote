"use client";

import { useEffect, useState } from "react";
import type { SessionInfo } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Abgelaufen";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const DISMISS_KEY = "session-banner-dismissed";

export function SessionBanner({ session }: { session: SessionInfo | null }) {
  const r = useResponsive();
  const [now, setNow] = useState(Date.now());
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  // Restore dismissed state from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISS_KEY);
    if (stored && session) {
      // Only stay dismissed if same session id
      setDismissed(stored === session.id);
    } else {
      setDismissed(false);
    }
  }, [session]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  function dismiss() {
    setDismissed(true);
    if (session) sessionStorage.setItem(DISMISS_KEY, session.id);
  }

  if (dismissed || !session) return null;

  // Only show for active or finished states — skip draft/cancelled
  if (session.status === "draft" || session.status === "cancelled") return null;

  const deadline = session.deadline ? new Date(session.deadline).getTime() : 0;
  const remaining = Math.max(0, deadline - now);

  let label: string;
  let accent: string;

  if (session.status === "finished") {
    label = "Abstimmung beendet";
    accent = "rgba(74,222,128,0.25)";
  } else if (remaining <= 0) {
    label = "Abstimmungszeit abgelaufen";
    accent = "rgba(255,59,92,0.25)";
  } else {
    label = `Abstimmung läuft — noch ${formatRemaining(remaining)}`;
    accent = "rgba(96,165,250,0.20)";
  }

  return (
    <div style={{
      position: "fixed",
      left: r.spacing.medium + 4,
      right: r.spacing.medium + 4,
      bottom: r.tabbarHeight + r.spacing.medium + r.spacing.small,
      maxWidth: r.breakpoint === "large" ? 800 : 520,
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: `${r.spacing.small}px ${r.spacing.medium}px`,
      borderRadius: r.borderRadius.small,
      border: "1px solid rgba(255,255,255,0.12)",
      backdropFilter: "blur(16px)",
      zIndex: 99,
      background: accent,
    }}>
      <span style={{ fontSize: r.fontSize.small, fontWeight: 800, color: "white", flex: 1, textAlign: "center" as const }}>{label}</span>
      <button onClick={dismiss} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: r.fontSize.body, cursor: "pointer", padding: "0 2px", lineHeight: 1 }} aria-label="Schliessen">
        ✕
      </button>
    </div>
  );
}
