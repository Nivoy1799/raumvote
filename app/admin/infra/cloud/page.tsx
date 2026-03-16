"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../../AdminContext";
import { s } from "../../styles";
import { QueueColumn, serviceRow, statusDot, timeAgo } from "../components";

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

export default function CloudServicesPage() {
  const { headers } = useAdmin();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadServices = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const id = setTimeout(loadServices, 0);
    const interval = setInterval(loadServices, 30000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [loadServices]);

  return (
    <>
      <section style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={s.cardTitle}>Service Health</div>
          <button style={s.btnTiny} onClick={loadServices} disabled={loading}>
            {loading ? "..." : "Aktualisieren"}
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
          {services.length === 0 && !loading && <div style={s.muted}>Keine Daten</div>}
        </div>
      </section>
    </>
  );
}
