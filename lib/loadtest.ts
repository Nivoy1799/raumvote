/* ── Load Test Runner ── */

export interface LoadTestScenario {
  label: string;
  endpoint: string;
  method: string;
  requests: number;
  concurrency: number;
}

export interface ScenarioResult {
  label: string;
  endpoint: string;
  method: string;
  totalRequests: number;
  concurrency: number;
  durationMs: number;
  rps: number;
  successCount: number;
  failCount: number;
  statusCodes: Record<number, number>;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface LoadTestResult {
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  tokenUsed: string;
  baseUrl: string;
  phase: string;
  scenarios: ScenarioResult[];
}

export const MAX_CONCURRENCY = 50;
export const MAX_REQUESTS = 500;
export const MAX_SCENARIOS = 6;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

export async function runScenario(
  baseUrl: string,
  scenario: LoadTestScenario,
  jwt: string,
  abortSignal?: AbortSignal,
): Promise<ScenarioResult> {
  const timings: number[] = [];
  const statusCodes: Record<number, number> = {};
  let successCount = 0;
  let failCount = 0;

  const t0 = Date.now();

  // Shared queue index
  let nextIdx = 0;
  const total = scenario.requests;

  async function worker() {
    while (!abortSignal?.aborted) {
      const idx = nextIdx++;
      if (idx >= total) break;

      const start = Date.now();
      try {
        const res = await fetch(`${baseUrl}${scenario.endpoint}`, {
          method: scenario.method,
          headers: jwt ? { Cookie: `rv-jwt=${jwt}` } : {},
          cache: "no-store",
          signal: abortSignal,
        });
        const elapsed = Date.now() - start;
        timings.push(elapsed);
        statusCodes[res.status] = (statusCodes[res.status] ?? 0) + 1;
        await res.text(); // consume body to close connection
        successCount++;
      } catch {
        const elapsed = Date.now() - start;
        timings.push(elapsed);
        failCount++;
      }
    }
  }

  // Launch concurrent workers
  const concurrency = Math.min(scenario.concurrency, MAX_CONCURRENCY);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalMs = Date.now() - t0;
  const sorted = [...timings].sort((a, b) => a - b);

  return {
    label: scenario.label,
    endpoint: scenario.endpoint,
    method: scenario.method,
    totalRequests: scenario.requests,
    concurrency,
    durationMs: totalMs,
    rps: totalMs > 0 ? Math.round((timings.length / totalMs) * 1000 * 100) / 100 : 0,
    successCount,
    failCount,
    statusCodes,
    latency: {
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      avg: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
    },
  };
}

export async function runLoadTest(
  baseUrl: string,
  scenarios: LoadTestScenario[],
  jwt: string,
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  const abort = AbortSignal.timeout(25_000);

  for (const scenario of scenarios) {
    if (abort.aborted) break;
    const result = await runScenario(baseUrl, scenario, jwt, abort);
    results.push(result);
  }

  return results;
}
