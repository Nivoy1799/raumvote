"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../../AdminContext";
import { s } from "../../styles";
import { StatBox, ScenarioCard, GrafanaDashboard } from "../components";
import type { LoadTestResult } from "@/lib/loadtest";

/* ── Nginx Stats ── */

interface NginxStats {
  activeConnections: number;
  accepts: number;
  handled: number;
  requests: number;
  reading: number;
  writing: number;
  waiting: number;
}

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

/* ── Pre/Post Load Test ── */

type Phase = "idle" | "pre-running" | "pre-done" | "post-running" | "done";

function DeltaBadge({
  label,
  pre,
  post,
  higher,
}: {
  label: string;
  pre: number;
  post: number;
  higher: "better" | "worse";
}) {
  if (pre === 0) return null;
  const pct = ((post - pre) / pre) * 100;
  const isImproved = higher === "better" ? pct > 0 : pct < 0;
  const color = Math.abs(pct) < 1 ? "rgba(255,255,255,0.4)" : isImproved ? "#4ade80" : "#ff3b5c";
  const pctStr =
    Math.abs(pct) > 999
      ? `${pct > 0 ? ">" : "<"}${pct > 0 ? "+" : "-"}999%`
      : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
  return (
    <span style={{ fontSize: 11, fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ opacity: 0.5 }}>{label}</span>
      <span style={{ fontWeight: 800, color }}>
        {pre} → {post}
        <span style={{ marginLeft: 3, fontSize: 10 }}>({pctStr})</span>
      </span>
    </span>
  );
}

export default function LoadbalancerPage() {
  const { headers } = useAdmin();

  // Nginx stats
  const [stats, setStats] = useState<NginxStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  // Pre/Post load test
  const [phase, setPhase] = useState<Phase>("idle");
  const [preResult, setPreResult] = useState<LoadTestResult | null>(null);
  const [postResult, setPostResult] = useState<LoadTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

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

  // Elapsed timer during test
  useEffect(() => {
    if (phase !== "pre-running" && phase !== "post-running") return;
    const t0 = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - t0), 100);
    return () => clearInterval(interval);
  }, [phase]);

  async function runTest(testPhase: "pre" | "post") {
    setError(null);
    setElapsed(0);
    setPhase(testPhase === "pre" ? "pre-running" : "post-running");

    try {
      const res = await fetch("/api/admin/loadtest", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ phase: testPhase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const result: LoadTestResult = await res.json();
      if (testPhase === "pre") {
        setPreResult(result);
        setPhase("pre-done");
      } else {
        setPostResult(result);
        setPhase("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase(testPhase === "pre" ? "idle" : "pre-done");
    }
  }

  function reset() {
    setPhase("idle");
    setPreResult(null);
    setPostResult(null);
    setError(null);
    setElapsed(0);
  }

  return (
    <>
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

      {/* ── Pre/Post Load Test ── */}
      <section style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <div style={s.cardTitle}>Load Test — Pre/Post Vergleich</div>
          {phase === "done" && (
            <button style={s.btnTiny} onClick={reset}>
              Neuer Test
            </button>
          )}
        </div>
        <div style={s.sub}>HTTP-Benchmark: Pre-Test → Deine Änderungen → Post-Test → Vergleich</div>

        {error && <div style={{ ...s.error, marginBottom: 12 }}>{error}</div>}

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "stretch" }}>
          {/* Step 1: Pre-Test */}
          <div
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${phase === "idle" || phase === "pre-running" ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
              background:
                phase === "idle" || phase === "pre-running"
                  ? "rgba(96,165,250,0.08)"
                  : preResult
                    ? "rgba(74,222,128,0.06)"
                    : "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 700, marginBottom: 6 }}>SCHRITT 1</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Pre-Test</div>
            {phase === "idle" && (
              <button style={s.btnSmall} onClick={() => runTest("pre")}>
                Starten
              </button>
            )}
            {phase === "pre-running" && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>Läuft... {(elapsed / 1000).toFixed(1)}s</div>
            )}
            {preResult && (
              <div style={{ fontSize: 11, opacity: 0.5 }}>
                {(preResult.totalDurationMs / 1000).toFixed(1)}s · {preResult.scenarios.length} Szenarien
              </div>
            )}
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.3,
              fontSize: 12,
              minWidth: 60,
            }}
          >
            <div>→</div>
            <div style={{ fontSize: 9, marginTop: 2 }}>Deine</div>
            <div style={{ fontSize: 9 }}>Änderungen</div>
            <div style={{ marginTop: 2 }}>→</div>
          </div>

          {/* Step 2: Post-Test */}
          <div
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${phase === "pre-done" || phase === "post-running" ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"}`,
              background:
                phase === "pre-done" || phase === "post-running"
                  ? "rgba(96,165,250,0.08)"
                  : postResult
                    ? "rgba(74,222,128,0.06)"
                    : "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 700, marginBottom: 6 }}>SCHRITT 2</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Post-Test</div>
            {phase === "pre-done" && (
              <button style={s.btnSmall} onClick={() => runTest("post")}>
                Starten
              </button>
            )}
            {phase === "post-running" && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>Läuft... {(elapsed / 1000).toFixed(1)}s</div>
            )}
            {postResult && (
              <div style={{ fontSize: 11, opacity: 0.5 }}>
                {(postResult.totalDurationMs / 1000).toFixed(1)}s · {postResult.scenarios.length} Szenarien
              </div>
            )}
            {(phase === "idle" || phase === "pre-running") && (
              <div style={{ fontSize: 11, opacity: 0.3 }}>Warte auf Pre-Test...</div>
            )}
          </div>
        </div>

        {/* Side-by-side Results */}
        {preResult && (
          <div>
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 12 }}>
              {preResult.baseUrl} · Token {preResult.tokenUsed}...
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  opacity: 0.5,
                  textTransform: "uppercase" as const,
                  letterSpacing: 0.5,
                }}
              >
                Pre-Test
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  opacity: 0.5,
                  textTransform: "uppercase" as const,
                  letterSpacing: 0.5,
                }}
              >
                Post-Test
              </div>
            </div>

            {/* Scenario rows: pre left, post right, delta below */}
            {preResult.scenarios.map((pre, i) => {
              const post = postResult?.scenarios[i];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Pre card */}
                    <ScenarioCard result={pre} />

                    {/* Post card or placeholder */}
                    {post ? (
                      <ScenarioCard result={post} />
                    ) : (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: `1px dashed ${phase === "done" ? "rgba(255,59,92,0.2)" : "rgba(255,255,255,0.08)"}`,
                          background: phase === "done" ? "rgba(255,59,92,0.04)" : undefined,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          color: phase === "done" ? "#ff3b5c" : undefined,
                          opacity: phase === "done" ? 0.7 : 0.3,
                        }}
                      >
                        {phase === "done" ? "Timeout — Szenario nicht erreicht" : "Warte auf Post-Test..."}
                      </div>
                    )}
                  </div>

                  {/* Delta row */}
                  {post && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 6,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(96,165,250,0.04)",
                        border: "1px solid rgba(96,165,250,0.1)",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.4, fontWeight: 700, marginRight: 4 }}>DELTA</span>
                      <DeltaBadge label="Req/s" pre={Math.round(pre.rps)} post={Math.round(post.rps)} higher="better" />
                      <DeltaBadge label="Ø ms" pre={pre.latency.avg} post={post.latency.avg} higher="worse" />
                      <DeltaBadge label="P50" pre={pre.latency.p50} post={post.latency.p50} higher="worse" />
                      <DeltaBadge label="P95" pre={pre.latency.p95} post={post.latency.p95} higher="worse" />
                      <DeltaBadge label="P99" pre={pre.latency.p99} post={post.latency.p99} higher="worse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* InfluxDB note */}
        {(preResult || postResult) && (
          <div style={{ fontSize: 10, opacity: 0.3, marginTop: 8 }}>
            Ergebnisse werden automatisch in InfluxDB gespeichert (falls verfügbar)
          </div>
        )}
      </section>

      <GrafanaDashboard uid="raumvote-nginx" title="Nginx Load Balancer" />
    </>
  );
}
