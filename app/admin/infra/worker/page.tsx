"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../../AdminContext";
import { s } from "../../styles";
import { QueueColumn, GrafanaDashboard, serviceRow, statusDot, timeAgo } from "../components";

interface WorkerStatus {
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

export default function WorkerPage() {
  const { headers } = useAdmin();
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/infra", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        const workerSvc = data.services?.find((s: { name: string }) => s.name === "Worker");
        if (workerSvc) setWorker(workerSvc);
        setStats(data.worker ?? null);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    const interval = setInterval(load, 15000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [load]);

  return (
    <>
      {/* Worker Status */}
      <section style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={s.cardTitle}>Worker Status</div>
          <button style={s.btnTiny} onClick={load} disabled={loading}>
            {loading ? "..." : "Aktualisieren"}
          </button>
        </div>
        <div style={s.sub}>Background Job Processing (aktualisiert alle 15s)</div>

        {worker && (
          <div style={serviceRow}>
            <div style={{ ...statusDot, background: worker.ok ? "#4ade80" : "#ff3b5c" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Worker</div>
              {worker.error && <div style={{ fontSize: 11, color: "#ff3b5c", marginTop: 2 }}>{worker.error}</div>}
              {worker.meta && (
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                  {worker.meta.lastActive
                    ? `Letzte Aktivität: vor ${timeAgo(worker.meta.lastActive as string)}`
                    : "Keine Aktivität"}
                  {" · "}
                  {(worker.meta.pendingImages as number) + (worker.meta.pendingJobs as number)} ausstehend
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
              {worker.latency}ms
            </div>
          </div>
        )}
      </section>

      {/* Queue Details */}
      {stats && (
        <section style={s.card}>
          <div style={s.cardTitle}>Queue Details</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 12 }}>
            Durchsatz: {stats.throughput.images + stats.throughput.jobs} Tasks / letzte {stats.throughput.windowMinutes}{" "}
            Min.
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <QueueColumn title="Image Tasks" counts={stats.imageTasks} />
            <QueueColumn title="Job Queue" counts={stats.jobQueue} />
          </div>
        </section>
      )}

      <GrafanaDashboard uid="raumvote-worker" title="Worker & Queue" />
    </>
  );
}
