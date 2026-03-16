"use client";

import { useEffect, useState } from "react";
import { s } from "../styles";
import type { ScenarioResult } from "@/lib/loadtest";

/* ── Grafana ── */

const GRAFANA_URL =
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3001` : "";

export function GrafanaDashboard({ uid, title }: { uid: string; title: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!GRAFANA_URL) return;
    fetch(`${GRAFANA_URL}/api/health`, { mode: "no-cors" })
      .then(() => setAvailable(true))
      .catch(() => setAvailable(false));
  }, []);

  if (available === false) {
    return (
      <section style={s.card}>
        <div style={s.cardTitle}>Grafana — {title}</div>
        <div
          style={{
            padding: 24,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}>Grafana ist nicht erreichbar auf Port 3001</div>
          <div style={{ fontSize: 11, opacity: 0.3, fontFamily: "monospace" }}>
            docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={s.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={s.cardTitle}>Grafana — {title}</div>
        <a
          href={`${GRAFANA_URL}/d/${uid}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, opacity: 0.4, marginLeft: "auto", textDecoration: "underline", color: "inherit" }}
        >
          Grafana öffnen
        </a>
      </div>
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#181818",
        }}
      >
        <iframe
          src={`${GRAFANA_URL}/d/${uid}/${uid}?orgId=1&theme=dark&kiosk`}
          style={{ width: "100%", height: 600, border: "none", display: "block" }}
          title={title}
        />
      </div>
    </section>
  );
}

/* ── StatBox ── */

export function StatBox({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: number;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        padding: small ? "8px 14px" : "12px 18px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: accent ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.04)",
        minWidth: small ? 80 : 110,
      }}
    >
      <div
        style={{
          fontSize: small ? 18 : 26,
          fontWeight: 950,
          letterSpacing: -0.5,
          color: accent ? "rgba(96,165,250,1)" : "white",
        }}
      >
        {value.toLocaleString("de-CH")}
      </div>
      <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 700, marginTop: 2, textTransform: "uppercase" as const }}>
        {label}
      </div>
    </div>
  );
}

/* ── QueueColumn ── */

const queueStatusLabels: Record<string, string> = {
  pending: "Ausstehend",
  generating: "Generiert",
  processing: "Verarbeitet",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
};

const queueStatusColors: Record<string, string> = {
  pending: "rgba(255,255,255,0.5)",
  generating: "rgba(96,165,250,1)",
  processing: "rgba(96,165,250,1)",
  completed: "#4ade80",
  failed: "#ff3b5c",
};

export function QueueColumn({ title, counts }: { title: string; counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
        {title} <span style={{ opacity: 0.4 }}>({total})</span>
      </div>
      {Object.entries(counts).length === 0 && <div style={{ fontSize: 11, opacity: 0.4 }}>Keine Tasks</div>}
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: queueStatusColors[status] ?? "rgba(255,255,255,0.3)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, opacity: 0.7, flex: 1 }}>{queueStatusLabels[status] ?? status}</span>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

/* ── ScenarioCard ── */

export function ScenarioCard({ result }: { result: ScenarioResult }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{result.label}</span>
        <span style={{ fontSize: 11, opacity: 0.4, fontFamily: "monospace" }}>
          {result.method} {result.endpoint.length > 40 ? result.endpoint.slice(0, 40) + "..." : result.endpoint}
        </span>
        <span style={{ fontSize: 11, opacity: 0.3, marginLeft: "auto" }}>
          {result.totalRequests} req · {result.concurrency} concurrent · {(result.durationMs / 1000).toFixed(1)}s
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <StatBox label="Req/s" value={Math.round(result.rps)} accent />
        <StatBox label="Ø ms" value={result.latency.avg} small />
        <StatBox label="P50" value={result.latency.p50} small />
        <StatBox label="P95" value={result.latency.p95} small />
        <StatBox label="P99" value={result.latency.p99} small />
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 11, flexWrap: "wrap" }}>
        <span style={{ color: "#4ade80", fontWeight: 800 }}>{result.successCount} OK</span>
        {result.failCount > 0 && <span style={{ color: "#ff3b5c", fontWeight: 800 }}>{result.failCount} Fehler</span>}
        <span style={{ opacity: 0.4 }}>
          {Object.entries(result.statusCodes)
            .map(([code, count]) => `[${code}] ${count}`)
            .join("  ")}
        </span>
      </div>
    </div>
  );
}

/* ── Shared styles ── */

export const serviceRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.2)",
};

export const statusDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};

/* ── Helpers ── */

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  return `${Math.round(diff / 3_600_000)}h`;
}
