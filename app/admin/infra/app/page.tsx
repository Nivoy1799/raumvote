"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { s } from "../../styles";
import { GrafanaDashboard, serviceRow, statusDot } from "../components";

const HISTORY_MAX = 90;
const TIME_WINDOWS = [
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 300_000 },
  { label: "15m", ms: 900_000 },
] as const;

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

export default function AppInstancesPage() {
  const [instances, setInstances] = useState<Map<string, InstanceInfo>>(new Map());
  const [probing, setProbing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(0);
  const instancesRef = useRef<Map<string, InstanceInfo>>(new Map());

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

  useEffect(() => {
    const id = setTimeout(probeInstances, 0);
    const interval = setInterval(probeInstances, 10000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [probeInstances]);

  const instanceList = Array.from(instances.values()).sort((a, b) => (a.dead ? 1 : 0) - (b.dead ? 1 : 0));
  const aliveCount = instanceList.filter((i) => !i.dead).length;
  const totalRequests = instanceList.reduce((a, i) => a + i.requests, 0);

  return (
    <>
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

      <GrafanaDashboard uid="raumvote-app" title="App Instances" />
    </>
  );
}
