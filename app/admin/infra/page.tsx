"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdmin } from "../AdminContext";
import { s } from "../styles";

/* ── Types ── */

interface NginxStats {
  activeConnections: number;
  accepts: number;
  handled: number;
  requests: number;
  reading: number;
  writing: number;
  waiting: number;
}

interface ServiceStatus {
  name: string;
  ok: boolean;
  latency: number;
  error?: string;
  meta?: Record<string, unknown>;
}

interface WorkerStats {
  imageTasks: Record<string, number>;
  jobQueue: Record<string, number>;
  throughput: { images: number; jobs: number; windowMinutes: number };
}

interface InstanceProbe {
  addr: string;
  name: string;
  ok: boolean;
  latency: number;
  time: number;
}

interface InstanceInfo {
  addr: string;
  name: string;
  ok: boolean;
  dead: boolean;
  lastSeen: number;
  avgLatency: number;
  requests: number;
  history: { latency: number; time: number; ok: boolean }[];
}

const HISTORY_MAX = 90; // 15 min × 6 probes/min
const TIME_WINDOWS = [
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 300_000 },
  { label: "15m", ms: 900_000 },
] as const;

/* ── Helpers ── */

function parseNginxStatus(text: string): NginxStats | null {
  try {
    const lines = text.trim().split("\n");
    const active = parseInt(lines[0].match(/\d+/)?.[0] ?? "0", 10);
    const counts = lines[2].trim().split(/\s+/).map(Number);
    const rww = lines[3].match(/Reading:\s*(\d+)\s*Writing:\s*(\d+)\s*Waiting:\s*(\d+)/);
    return {
      activeConnections: active,
      accepts: counts[0],
      handled: counts[1],
      requests: counts[2],
      reading: rww ? parseInt(rww[1], 10) : 0,
      writing: rww ? parseInt(rww[2], 10) : 0,
      waiting: rww ? parseInt(rww[3], 10) : 0,
    };
  } catch {
    return null;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  return `${Math.round(diff / 3_600_000)}h`;
}

/* ── Page ── */

export default function InfraPage() {
  const { headers } = useAdmin();

  const [stats, setStats] = useState<NginxStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [instances, setInstances] = useState<Map<string, InstanceInfo>>(new Map());
  const [probing, setProbing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(0); // index into TIME_WINDOWS
  const instancesRef = useRef<Map<string, InstanceInfo>>(new Map());

  // Poll nginx stats
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/nginx_status");
        if (!res.ok) throw new Error();
        const text = await res.text();
        if (active) {
          const parsed = parseNginxStatus(text);
          setStats(parsed);
          setStatsError(!parsed);
        }
      } catch {
        if (active) setStatsError(true);
      }
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Poll service health
  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const res = await fetch("/api/admin/infra", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
        setWorkerStats(data.worker ?? null);
      }
    } catch {
      /* ignore */
    }
    setServicesLoading(false);
  }, [headers]);

  useEffect(() => {
    loadServices();
    const interval = setInterval(loadServices, 30000);
    return () => clearInterval(interval);
  }, [loadServices]);

  // Probe app instances
  const probeInstances = useCallback(async () => {
    setProbing(true);
    const probes: InstanceProbe[] = [];
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => {
        const t0 = Date.now();
        return fetch("/api/health", { cache: "no-store" }).then((res) => ({
          addr: (res.headers.get("x-upstream-addr") ?? "unbekannt").split(",").pop()!.trim(),
          name: res.headers.get("x-instance-id") ?? "",
          ok: res.ok,
          latency: Date.now() - t0,
          time: Date.now(),
        }));
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") probes.push(r.value);
    }

    const now = Date.now();
    const seenAddrs = new Set(probes.map((p) => p.addr));

    // Merge into existing instance data
    const current = new Map(instancesRef.current);
    for (const probe of probes) {
      const existing = current.get(probe.addr);
      if (existing) {
        const history = [...existing.history, { latency: probe.latency, time: probe.time, ok: probe.ok }].slice(
          -HISTORY_MAX,
        );
        const okHistory = history.filter((h) => h.ok);
        current.set(probe.addr, {
          addr: probe.addr,
          name: probe.name || existing.name,
          ok: probe.ok,
          dead: false,
          lastSeen: now,
          avgLatency:
            okHistory.length > 0 ? Math.round(okHistory.reduce((a, h) => a + h.latency, 0) / okHistory.length) : 0,
          requests: existing.requests + 1,
          history,
        });
      } else {
        current.set(probe.addr, {
          addr: probe.addr,
          name: probe.name,
          ok: probe.ok,
          dead: false,
          lastSeen: now,
          avgLatency: probe.latency,
          requests: 1,
          history: [{ latency: probe.latency, time: probe.time, ok: probe.ok }],
        });
      }
    }

    // Instance not seen in 10 probes → mark as dead + add red bar to history
    for (const [addr, info] of current) {
      if (!seenAddrs.has(addr)) {
        const history = [...info.history, { latency: 0, time: now, ok: false }].slice(-HISTORY_MAX);
        current.set(addr, { ...info, dead: true, ok: false, history });
      }
    }

    instancesRef.current = current;
    setInstances(new Map(current));
    setProbing(false);
  }, []);

  // Auto-probe on mount + every 10s
  useEffect(() => {
    probeInstances();
    const interval = setInterval(probeInstances, 10000);
    return () => clearInterval(interval);
  }, [probeInstances]);

  const instanceList = Array.from(instances.values()).sort((a, b) => (a.dead ? 1 : 0) - (b.dead ? 1 : 0));
  const aliveCount = instanceList.filter((i) => !i.dead).length;
  const totalRequests = instanceList.reduce((a, i) => a + i.requests, 0);

  return (
    <>
      {/* ── App Instances ── */}
      <section style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={s.cardTitle}>App Instanzen</div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: aliveCount === instanceList.length ? "rgba(255,255,255,0.4)" : "#ff3b5c",
            }}
          >
            {aliveCount}/{instanceList.length} aktiv
          </span>
          <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
            {TIME_WINDOWS.map((w, i) => (
              <button
                key={w.label}
                onClick={() => setTimeWindow(i)}
                style={{
                  ...s.btnTiny,
                  background: timeWindow === i ? "rgba(96,165,250,0.3)" : undefined,
                  borderColor: timeWindow === i ? "rgba(96,165,250,0.5)" : undefined,
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button style={s.btnTiny} onClick={probeInstances} disabled={probing}>
            {probing ? "..." : "Probe"}
          </button>
        </div>
        <div style={s.sub}>Auto-Discovery alle 10s via /api/health</div>

        <div style={{ display: "grid", gap: 8 }}>
          {instanceList.map((inst) => {
            const pct = totalRequests > 0 ? Math.round((inst.requests / totalRequests) * 100) : 0;
            const displayName = inst.name ? inst.name.slice(0, 12) : inst.addr;
            return (
              <div key={inst.addr} style={{ ...serviceRow, opacity: inst.dead ? 0.4 : 1 }}>
                <div style={{ ...statusDot, background: inst.dead ? "#ff3b5c" : inst.ok ? "#4ade80" : "#fbbf24" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace" }}>{displayName}</span>
                    {inst.dead && (
                      <span
                        style={{ fontSize: 10, fontWeight: 800, color: "#ff3b5c", textTransform: "uppercase" as const }}
                      >
                        Offline
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                    {inst.addr}
                    {!inst.dead && (
                      <>
                        {" "}
                        · {inst.requests} Anfragen ({pct}%) · Ø {inst.avgLatency}ms
                      </>
                    )}
                  </div>
                </div>
                {/* Mini sparkline filtered by time window */}
                {(() => {
                  const cutoff = Date.now() - TIME_WINDOWS[timeWindow].ms;
                  const filtered = inst.history.filter((h) => h.time >= cutoff);
                  return (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 24, flexShrink: 0 }}>
                      {filtered.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: 3,
                            height: Math.max(2, Math.min(24, h.latency / 8)),
                            borderRadius: 1,
                            background: h.ok ? "rgba(96,165,250,0.7)" : "#ff3b5c",
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {instanceList.length === 0 && <div style={s.muted}>Suche Instanzen...</div>}
        </div>
      </section>

      {/* ── Service Health ── */}
      <section style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={s.cardTitle}>Service Health</div>
          <button style={s.btnTiny} onClick={loadServices} disabled={servicesLoading}>
            {servicesLoading ? "..." : "Aktualisieren"}
          </button>
        </div>
        <div style={s.sub}>Externe Dienste und Worker (aktualisiert alle 30s)</div>

        <div style={{ display: "grid", gap: 8 }}>
          {services.map((svc) => (
            <div key={svc.name}>
              <div
                style={{
                  ...serviceRow,
                  ...(svc.name === "Worker" && workerStats ? { cursor: "pointer" } : {}),
                }}
                onClick={svc.name === "Worker" && workerStats ? () => setWorkerOpen(!workerOpen) : undefined}
              >
                <div style={{ ...statusDot, background: svc.ok ? "#4ade80" : "#ff3b5c" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{svc.name}</div>
                  {svc.error && <div style={{ fontSize: 11, color: "#ff3b5c", marginTop: 2 }}>{svc.error}</div>}
                  {svc.name === "Worker" && svc.meta && (
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                      {svc.meta.lastActive
                        ? `Letzte Aktivität: vor ${timeAgo(svc.meta.lastActive as string)}`
                        : "Keine Aktivität"}
                      {" · "}
                      {(svc.meta.pendingImages as number) + (svc.meta.pendingJobs as number)} ausstehend
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                  {svc.latency}ms
                </div>
                {svc.name === "Worker" && workerStats && (
                  <div style={{ fontSize: 10, opacity: 0.3, flexShrink: 0 }}>{workerOpen ? "▲" : "▼"}</div>
                )}
              </div>

              {/* Collapsible worker queue details */}
              {svc.name === "Worker" && workerOpen && workerStats && (
                <div
                  style={{
                    padding: "10px 14px",
                    marginTop: -1,
                    borderRadius: "0 0 14px 14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>
                    Durchsatz: {workerStats.throughput.images + workerStats.throughput.jobs} Tasks / letzte{" "}
                    {workerStats.throughput.windowMinutes} Min.
                  </div>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    <QueueColumn title="Image Tasks" counts={workerStats.imageTasks} />
                    <QueueColumn title="Job Queue" counts={workerStats.jobQueue} />
                  </div>
                </div>
              )}
            </div>
          ))}
          {services.length === 0 && !servicesLoading && <div style={s.muted}>Keine Daten</div>}
        </div>
      </section>

      {/* ── Nginx Stats ── */}
      <section style={s.card}>
        <div style={s.cardTitle}>Nginx Load Balancer</div>
        <div style={s.sub}>Live-Statistiken (aktualisiert alle 5s)</div>

        {statsError && <div style={s.error}>Konnte /nginx_status nicht laden</div>}

        {stats && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              <StatBox label="Aktive Verbindungen" value={stats.activeConnections} accent />
              <StatBox label="Requests" value={stats.requests} />
              <StatBox label="Akzeptiert" value={stats.accepts} />
              <StatBox label="Bearbeitet" value={stats.handled} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <StatBox label="Lesen" value={stats.reading} small />
              <StatBox label="Schreiben" value={stats.writing} small />
              <StatBox label="Wartend" value={stats.waiting} small />
            </div>
          </>
        )}
      </section>
    </>
  );
}

/* ── Small components ── */

function StatBox({ label, value, accent, small }: { label: string; value: number; accent?: boolean; small?: boolean }) {
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

function QueueColumn({ title, counts }: { title: string; counts: Record<string, number> }) {
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

/* ── Inline styles ── */

const serviceRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.2)",
};

const statusDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};
