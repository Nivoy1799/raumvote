import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type JobType = "pre-generation" | "image-process";

/**
 * Enqueue a background job into the Postgres-backed queue.
 */
export async function enqueue(type: JobType, payload: Record<string, unknown>): Promise<string> {
  const job = await prisma.jobQueue.create({
    data: { type, payload: payload as Prisma.InputJsonValue },
  });
  return job.id;
}

/**
 * Claim and return the next pending job using SELECT FOR UPDATE SKIP LOCKED.
 * Returns null if no jobs are available.
 */
export async function claimNextJob() {
  // Use raw query for SKIP LOCKED which Prisma doesn't support natively
  const jobs = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "JobQueue"
    WHERE status = 'pending' AND attempts < "maxAttempts"
    ORDER BY "createdAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  if (jobs.length === 0) return null;

  const job = await prisma.jobQueue.update({
    where: { id: jobs[0].id },
    data: {
      status: "processing",
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  return job;
}

export async function completeJob(jobId: string) {
  await prisma.jobQueue.update({
    where: { id: jobId },
    data: { status: "completed", completedAt: new Date() },
  });
}

export async function failJob(jobId: string, error: string) {
  const job = await prisma.jobQueue.findUnique({ where: { id: jobId } });
  const canRetry = job && job.attempts < job.maxAttempts;

  await prisma.jobQueue.update({
    where: { id: jobId },
    data: {
      status: canRetry ? "pending" : "failed",
      error,
      startedAt: null,
      ...(canRetry ? {} : { completedAt: new Date() }),
    },
  });
}
