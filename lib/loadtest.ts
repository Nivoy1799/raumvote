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
export const MAX_REQUESTS = 1000;
export const MAX_SCENARIOS = 6;

/** Number of warmup requests per worker before measurement begins */
const WARMUP_PER_WORKER = 5;

/** Cooldown pause between scenarios (ms) to let connections settle */
const COOLDOWN_MS = 1000;

/** Number of iterations per scenario — results are aggregated across all runs */
const ITERATIONS = 5;

/** Trim top/bottom N% of latency samples to remove outliers */
const TRIM_PERCENT = 5;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

function trimmedSlice(sorted: number[], trimPct: number): number[] {
  if (sorted.length < 10 || trimPct <= 0) return sorted;
  const trimCount = Math.floor(sorted.length * (trimPct / 100));
  return sorted.slice(trimCount, sorted.length - trimCount);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** High-resolution timer (sub-ms) using performance.now() */
function hrtimeMs(): number {
  return performance.now();
}

async function fireRequest(
  url: string,
  method: string,
  jwt: string,
  abortSignal?: AbortSignal,
): Promise<{ elapsedMs: number; status: number; ok: boolean }> {
  const start = hrtimeMs();
  try {
    const res = await fetch(url, {
      method,
      headers: jwt ? { Cookie: `rv-jwt=${jwt}` } : {},
      cache: "no-store",
      signal: abortSignal,
    });
    const elapsedMs = hrtimeMs() - start;
    await res.text(); // consume body
    return { elapsedMs, status: res.status, ok: true };
  } catch {
    const elapsedMs = hrtimeMs() - start;
    return { elapsedMs, status: 0, ok: false };
  }
}

export async function runScenario(
  baseUrl: string,
  scenario: LoadTestScenario,
  jwt: string,
  abortSignal?: AbortSignal,
): Promise<ScenarioResult> {
  const url = `${baseUrl}${scenario.endpoint}`;
  const concurrency = Math.min(scenario.concurrency, MAX_CONCURRENCY);

  // ── Phase 1: Warmup (not measured) ──
  // Fire a few requests per worker to warm up connections, JIT, and pools
  const warmupTotal = concurrency * WARMUP_PER_WORKER;
  let warmupIdx = 0;

  async function warmupWorker() {
    while (!abortSignal?.aborted) {
      const idx = warmupIdx++;
      if (idx >= warmupTotal) break;
      await fireRequest(url, scenario.method, jwt, abortSignal);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => warmupWorker()));

  // Small pause after warmup to let event loop settle
  if (!abortSignal?.aborted) await sleep(50);

  // ── Phase 2: Measured requests ──
  const timings: number[] = [];
  const statusCodes: Record<number, number> = {};
  let successCount = 0;
  let failCount = 0;

  const t0 = hrtimeMs();

  let nextIdx = 0;
  const total = scenario.requests;

  async function worker() {
    while (!abortSignal?.aborted) {
      const idx = nextIdx++;
      if (idx >= total) break;

      const result = await fireRequest(url, scenario.method, jwt, abortSignal);
      timings.push(result.elapsedMs);

      if (result.ok) {
        statusCodes[result.status] = (statusCodes[result.status] ?? 0) + 1;
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const totalMs = hrtimeMs() - t0;
  const sorted = [...timings].sort((a, b) => a - b);

  // Trim outliers for avg calculation (but report raw min/max/percentiles)
  const trimmed = trimmedSlice(sorted, TRIM_PERCENT);
  const trimmedAvg =
    trimmed.length > 0 ? Math.round((trimmed.reduce((a, b) => a + b, 0) / trimmed.length) * 100) / 100 : 0;

  return {
    label: scenario.label,
    endpoint: scenario.endpoint,
    method: scenario.method,
    totalRequests: scenario.requests,
    concurrency,
    durationMs: Math.round(totalMs),
    rps: totalMs > 0 ? Math.round((timings.length / totalMs) * 1000 * 100) / 100 : 0,
    successCount,
    failCount,
    statusCodes,
    latency: {
      min: Math.round(sorted[0] ?? 0),
      max: Math.round(sorted[sorted.length - 1] ?? 0),
      avg: Math.round(trimmedAvg),
      p50: Math.round(percentile(sorted, 0.5)),
      p95: Math.round(percentile(sorted, 0.95)),
      p99: Math.round(percentile(sorted, 0.99)),
    },
  };
}

/** Aggregate multiple iteration results into one stable result */
function aggregateResults(runs: ScenarioResult[]): ScenarioResult {
  if (runs.length === 1) return runs[0];

  // Use median of each metric across iterations for stability
  const medianOf = (values: number[]) => {
    const s = [...values].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  const avgOf = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const mergedStatusCodes: Record<number, number> = {};
  for (const run of runs) {
    for (const [code, count] of Object.entries(run.statusCodes)) {
      mergedStatusCodes[Number(code)] = (mergedStatusCodes[Number(code)] ?? 0) + count;
    }
  }

  return {
    label: runs[0].label,
    endpoint: runs[0].endpoint,
    method: runs[0].method,
    totalRequests: runs.reduce((sum, r) => sum + r.totalRequests, 0),
    concurrency: runs[0].concurrency,
    durationMs: runs.reduce((sum, r) => sum + r.durationMs, 0),
    rps: Math.round(medianOf(runs.map((r) => r.rps)) * 100) / 100,
    successCount: runs.reduce((sum, r) => sum + r.successCount, 0),
    failCount: runs.reduce((sum, r) => sum + r.failCount, 0),
    statusCodes: mergedStatusCodes,
    latency: {
      min: Math.min(...runs.map((r) => r.latency.min)),
      max: Math.max(...runs.map((r) => r.latency.max)),
      avg: medianOf(runs.map((r) => r.latency.avg)),
      p50: medianOf(runs.map((r) => r.latency.p50)),
      p95: medianOf(runs.map((r) => r.latency.p95)),
      p99: medianOf(runs.map((r) => r.latency.p99)),
    },
  };
}

export async function runLoadTest(
  baseUrl: string,
  scenarios: LoadTestScenario[],
  jwt: string,
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  const abort = AbortSignal.timeout(120_000); // 2min for 5 iterations + cooldowns

  for (const scenario of scenarios) {
    if (abort.aborted) break;

    const iterationResults: ScenarioResult[] = [];

    for (let iter = 0; iter < ITERATIONS; iter++) {
      if (abort.aborted) break;
      const result = await runScenario(baseUrl, scenario, jwt, abort);
      iterationResults.push(result);

      // Cooldown between iterations (skip after last)
      if (iter < ITERATIONS - 1 && !abort.aborted) {
        await sleep(COOLDOWN_MS);
      }
    }

    if (iterationResults.length > 0) {
      results.push(aggregateResults(iterationResults));
    }

    // Cooldown between scenarios
    if (!abort.aborted) await sleep(COOLDOWN_MS);
  }

  return results;
}
