"use client";

import { memo, useEffect, useState } from "react";
import type { SessionInfo } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtRemaining(ms: number): string {
  if (ms <= 0) return "Abgelaufen";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days} Tag${days !== 1 ? "e" : ""} ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export const SessionTimeline = memo(function SessionTimeline({
  session,
}: {
  session: SessionInfo | null;
}) {
  const r = useResponsive();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const trackH = r.breakpoint === "large" ? 8 : 6;

  if (!session) {
    return (
      <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: r.borderRadius.medium, padding: r.spacing.medium, backdropFilter: "blur(14px)", marginBottom: r.spacing.medium }}>
        <div style={{ fontSize: r.fontSize.body, fontWeight: 900, marginBottom: 4 }}>Abstimmungs-Zeitraum</div>
        <div style={{ opacity: 0.65, fontSize: r.fontSize.small, lineHeight: 1.35 }}>Noch keine aktive Abstimmung.</div>
      </section>
    );
  }

  const startMs = session.startedAt ? new Date(session.startedAt).getTime() : 0;
  const deadlineMs = session.deadline ? new Date(session.deadline).getTime() : 0;
  const totalSpan = deadlineMs - startMs;
  const elapsed = now - startMs;
  const remaining = Math.max(0, deadlineMs - now);

  const isFinished = session.status === "finished" || session.status === "cancelled";
  const isExpired = session.status === "active" && remaining <= 0;
  const progress = totalSpan > 0 ? Math.min(1, Math.max(0, elapsed / totalSpan)) : 0;
  const pct = isFinished || isExpired ? 100 : Math.round(progress * 100);

  let statusLabel: string;
  let statusColor: string;
  if (session.status === "draft") {
    statusLabel = "Entwurf";
    statusColor = "rgba(255,255,255,0.5)";
  } else if (session.status === "cancelled") {
    statusLabel = "Abgebrochen";
    statusColor = "#ff3b5c";
  } else if (session.status === "finished" || isExpired) {
    statusLabel = "Beendet";
    statusColor = "#4ade80";
  } else {
    statusLabel = "Aktiv";
    statusColor = "#60a5fa";
  }

  return (
    <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: r.borderRadius.medium, padding: r.spacing.medium, backdropFilter: "blur(14px)", marginBottom: r.spacing.medium }}>
      <div style={{ fontSize: r.fontSize.body, fontWeight: 900, marginBottom: 4 }}>Abstimmungs-Zeitraum</div>
      {session.title && <div style={{ fontSize: r.fontSize.small, opacity: 0.7, marginBottom: r.spacing.small + 2 }}>{session.title}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r.spacing.small + 2 }}>
        <span style={{ fontSize: r.fontSize.small - 1, fontWeight: 900, padding: "3px 10px", borderRadius: 8, border: "1px solid", background: statusColor + "22", color: statusColor, borderColor: statusColor + "44" }}>
          {statusLabel}
        </span>
        {session.status === "active" && remaining > 0 && (
          <span style={{ fontSize: r.fontSize.small, fontWeight: 800, opacity: 0.8 }}>noch {fmtRemaining(remaining)}</span>
        )}
      </div>

      <div style={{ height: trackH, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: trackH, borderRadius: 999, transition: "width 0.5s ease", width: `${pct}%`, background: statusColor }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: r.fontSize.small - 1, opacity: 0.55, fontWeight: 700 }}>{fmtDate(session.startedAt)}</span>
        <span style={{ fontSize: r.fontSize.small - 1, opacity: 0.55, fontWeight: 700 }}>{fmtDate(session.deadline)}</span>
      </div>

      <div style={{ marginTop: r.spacing.small }}>
        <span style={{ opacity: 0.65, fontSize: r.fontSize.small, lineHeight: 1.35 }}>{session.durationDays} Tage Abstimmungsdauer</span>
      </div>
    </section>
  );
});
