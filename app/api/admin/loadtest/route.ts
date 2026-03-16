import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runLoadTest, MAX_CONCURRENCY, MAX_REQUESTS, MAX_SCENARIOS } from "@/lib/loadtest";
import type { LoadTestScenario, ScenarioResult } from "@/lib/loadtest";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const BASE_URL =
  process.env.LOADTEST_BASE_URL ||
  (process.env.NODE_ENV === "production" ? "http://nginx" : `http://localhost:${process.env.PORT || 3000}`);

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

const DEFAULT_SCENARIOS: LoadTestScenario[] = [
  { label: "Warmup", endpoint: "/api/auth/me", method: "GET", requests: 50, concurrency: 10 },
  { label: "Baseline", endpoint: "/api/auth/me", method: "GET", requests: 200, concurrency: 25 },
  { label: "Health Check", endpoint: "/api/health", method: "GET", requests: 200, concurrency: 25 },
];

/* ── InfluxDB persistence ── */

function escapeTag(v: string): string {
  return v.replace(/ /g, "\\ ").replace(/,/g, "\\,").replace(/=/g, "\\=");
}

async function writeToInfluxDB(results: ScenarioResult[], phase: string, timestampMs: number): Promise<void> {
  const token = process.env.INFLUXDB_TOKEN;
  const org = process.env.INFLUXDB_ORG || "raumvote";
  const bucket = process.env.INFLUXDB_BUCKET || "metrics";
  const url = process.env.INFLUXDB_URL || "http://influxdb:8086";

  if (!token) return;

  const lines = results.map((r) => {
    const tags = [
      `phase=${escapeTag(phase)}`,
      `label=${escapeTag(r.label)}`,
      `endpoint=${escapeTag(r.endpoint)}`,
      `method=${escapeTag(r.method)}`,
    ].join(",");
    const fields = [
      `rps=${r.rps}`,
      `latency_avg=${r.latency.avg}i`,
      `latency_p50=${r.latency.p50}i`,
      `latency_p95=${r.latency.p95}i`,
      `latency_p99=${r.latency.p99}i`,
      `latency_min=${r.latency.min}i`,
      `latency_max=${r.latency.max}i`,
      `success_count=${r.successCount}i`,
      `fail_count=${r.failCount}i`,
      `duration_ms=${r.durationMs}i`,
      `total_requests=${r.totalRequests}i`,
      `concurrency=${r.concurrency}i`,
    ].join(",");
    return `loadtest,${tags} ${fields} ${timestampMs}`;
  });

  try {
    await fetch(
      `${url}/api/v2/write?org=${encodeURIComponent(org)}&bucket=${encodeURIComponent(bucket)}&precision=ms`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "text/plain",
        },
        body: lines.join("\n"),
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch {
    // InfluxDB write failures are non-critical
  }
}

/* ── Endpoint ── */

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get an active token
  const tokenRecord = await prisma.accessToken.findFirst({
    where: { active: true },
  });
  if (!tokenRecord) {
    return NextResponse.json({ error: "Kein aktiver Token vorhanden" }, { status: 400 });
  }

  // 2. Login to get JWT
  let jwt: string;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRecord.token }),
    });
    if (!loginRes.ok) {
      return NextResponse.json({ error: "JWT-Login fehlgeschlagen" }, { status: 500 });
    }
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const jwtMatch = setCookie.match(/rv-jwt=([^;]+)/);
    if (!jwtMatch) {
      return NextResponse.json({ error: "JWT-Cookie nicht erhalten" }, { status: 500 });
    }
    jwt = jwtMatch[1];
  } catch (err) {
    return NextResponse.json(
      { error: `Login fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // 3. Build scenarios
  const body = await req.json().catch(() => null);
  const phase: string = body?.phase ?? "default";
  let scenarios: LoadTestScenario[];

  if (body?.scenarios && Array.isArray(body.scenarios)) {
    scenarios = body.scenarios.slice(0, MAX_SCENARIOS).map((s: Record<string, unknown>) => ({
      label: String(s.label ?? "Custom"),
      endpoint: String(s.endpoint ?? "/api/health"),
      method: String(s.method ?? "GET"),
      requests: Math.min(Math.max(Number(s.requests) || 50, 1), MAX_REQUESTS),
      concurrency: Math.min(Math.max(Number(s.concurrency) || 10, 1), MAX_CONCURRENCY),
    }));
  } else {
    scenarios = [...DEFAULT_SCENARIOS];

    // Add vote/status scenario if active session exists
    const activeSession = await prisma.votingSession.findFirst({
      where: { status: "active" },
      select: { id: true },
    });
    if (activeSession) {
      scenarios.push({
        label: "Vote Status (JWT + DB)",
        endpoint: `/api/vote/status?sessionId=${activeSession.id}`,
        method: "GET",
        requests: 200,
        concurrency: 25,
      });
    }
  }

  // 4. Run the test
  const startedAt = new Date();
  const results = await runLoadTest(BASE_URL, scenarios, jwt);
  const completedAt = new Date();

  // 5. Persist to InfluxDB (fire-and-forget)
  writeToInfluxDB(results, phase, startedAt.getTime());

  return NextResponse.json({
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    tokenUsed: tokenRecord.token.slice(0, 8),
    baseUrl: BASE_URL,
    phase,
    scenarios: results,
  });
}
