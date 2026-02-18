import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkR2Health } from "@/lib/r2";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

type ServiceStatus = {
  name: string;
  ok: boolean;
  latency: number;
  error?: string;
  meta?: Record<string, unknown>;
};

async function checkService(
  name: string,
  fn: () => Promise<{ ok: boolean; error?: string; meta?: Record<string, unknown> }>,
): Promise<ServiceStatus> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { name, ok: result.ok, latency: Date.now() - t0, error: result.error, meta: result.meta };
  } catch (err) {
    return { name, ok: false, latency: Date.now() - t0, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [db, r2, openai, gemini, worker] = await Promise.all([
    // Neon (Postgres)
    checkService("Neon (Postgres)", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    }),

    // Cloudflare R2
    checkService("Cloudflare R2", async () => {
      if (!process.env.R2_ENDPOINT) return { ok: false, error: "R2_ENDPOINT nicht konfiguriert" };
      return await checkR2Health();
    }),

    // OpenAI
    checkService("OpenAI", async () => {
      if (!process.env.OPENAI_API_KEY) return { ok: false, error: "OPENAI_API_KEY nicht konfiguriert" };
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    }),

    // Gemini
    checkService("Google Gemini", async () => {
      if (!process.env.GEMINI_API_KEY) return { ok: false, error: "GEMINI_API_KEY nicht konfiguriert" };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    }),

    // Worker (check via recent activity in ImageTask / JobQueue)
    checkService("Worker", async () => {
      const recentImage = await prisma.imageTask.findFirst({
        where: { status: { in: ["generating", "completed"] } },
        orderBy: { startedAt: "desc" },
        select: { status: true, startedAt: true, completedAt: true },
      });
      const recentJob = await prisma.jobQueue.findFirst({
        where: { status: { in: ["processing", "completed"] } },
        orderBy: { startedAt: "desc" },
        select: { status: true, startedAt: true, completedAt: true },
      });

      const lastActive = recentImage?.startedAt ?? recentJob?.startedAt ?? null;
      const isRecent = lastActive && Date.now() - lastActive.getTime() < 5 * 60 * 1000;

      const pendingImages = await prisma.imageTask.count({ where: { status: "pending" } });
      const pendingJobs = await prisma.jobQueue.count({ where: { status: "pending" } });

      return {
        ok: isRecent || (pendingImages === 0 && pendingJobs === 0),
        error: !lastActive ? "Keine Aktivität gefunden" : undefined,
        meta: {
          lastActive: lastActive?.toISOString() ?? null,
          pendingImages,
          pendingJobs,
        },
      };
    }),
  ]);

  // Worker queue stats (detailed)
  const [imgStats, jobStats] = await Promise.all([
    prisma.imageTask.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.jobQueue.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const imageCounts: Record<string, number> = {};
  for (const g of imgStats) imageCounts[g.status] = g._count._all;

  const jobCounts: Record<string, number> = {};
  for (const g of jobStats) jobCounts[g.status] = g._count._all;

  // Recent throughput: tasks completed in the last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [recentImages, recentJobs] = await Promise.all([
    prisma.imageTask.count({ where: { status: "completed", completedAt: { gte: fiveMinAgo } } }),
    prisma.jobQueue.count({ where: { status: "completed", completedAt: { gte: fiveMinAgo } } }),
  ]);

  return NextResponse.json({
    services: [db, r2, openai, gemini, worker],
    worker: {
      imageTasks: imageCounts,
      jobQueue: jobCounts,
      throughput: { images: recentImages, jobs: recentJobs, windowMinutes: 5 },
    },
  });
}
