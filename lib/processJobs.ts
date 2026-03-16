/**
 * Inline job processor for environments without the standalone worker.
 *
 * Processes pending JobQueue entries (pre-generation) and their resulting
 * image tasks directly within the Next.js process.
 */

import { prisma } from "@/lib/prisma";
import { processImageTaskById } from "@/lib/processImageTask";

/**
 * Process all pending jobs for a given session, then process any resulting image tasks.
 * Fire-and-forget safe — logs errors but never throws.
 */
export function processJobsInBackground(sessionId: string): void {
  processSessionJobs(sessionId).catch((err) => {
    console.error("[processJobs] Background error:", err);
  });
}

async function processSessionJobs(sessionId: string): Promise<void> {
  // Process up to 10 pending jobs for this session
  const jobs = await prisma.jobQueue.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  // Filter to jobs related to this session
  const sessionJobs = jobs.filter((j) => {
    const payload = j.payload as Record<string, unknown>;
    return payload.sessionId === sessionId;
  });

  for (const job of sessionJobs) {
    // Optimistic claim
    const { count } = await prisma.jobQueue.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "processing", startedAt: new Date(), attempts: { increment: 1 } },
    });
    if (count === 0) continue;

    try {
      const payload = job.payload as Record<string, unknown>;
      if (job.type === "pre-generation") {
        await handlePreGeneration(payload);
      }
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const fresh = await prisma.jobQueue.findUnique({ where: { id: job.id } });
      const canRetry = fresh && fresh.attempts < fresh.maxAttempts;
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: canRetry ? "pending" : "failed",
          error: msg,
          startedAt: null,
          ...(canRetry ? {} : { completedAt: new Date() }),
        },
      });
    }
  }

  // Now process any pending image tasks for this session
  const pendingImages = await prisma.imageTask.findMany({
    where: { sessionId, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  await Promise.all(pendingImages.map((t) => processImageTaskById(t.id)));
}

async function handlePreGeneration(payload: Record<string, unknown>) {
  const { nodeId, sessionId, currentDepth, config } = payload as {
    nodeId: string;
    sessionId: string;
    currentDepth: number;
    config: {
      systemPrompt: string;
      modelName: string;
      placeholderUrl: string;
      imageModel: string;
      imagePrompt: string | null;
      referenceMedia: string[];
    };
  };

  const PRE_LOAD_DEPTH = 5;
  if (currentDepth >= PRE_LOAD_DEPTH) return;

  const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
  if (!node || node.generated) return;

  const { generateTreeNodes } = await import("@/lib/openai");

  // Build episode (path to root)
  const path: Array<{ titel: string; beschreibung: string; context: string; side: string | null }> = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    const found: {
      titel: string;
      beschreibung: string;
      context: string;
      side: string | null;
      parentId: string | null;
    } | null = await prisma.treeNode.findUnique({ where: { id: currentId } });
    if (!found) break;
    path.unshift({
      titel: found.titel,
      beschreibung: found.beschreibung,
      context: found.context,
      side: found.side,
    });
    currentId = found.parentId;
  }

  const generated = await generateTreeNodes(config.systemPrompt, path, config.modelName);

  const [leftChild, rightChild] = await Promise.all([
    prisma.treeNode.create({
      data: {
        sessionId,
        titel: generated.left.titel,
        beschreibung: generated.left.beschreibung,
        context: generated.left.context,
        mediaUrl: config.placeholderUrl,
        side: "left",
        depth: currentDepth + 1,
        parentId: nodeId,
        discovererHash: null,
      },
    }),
    prisma.treeNode.create({
      data: {
        sessionId,
        titel: generated.right.titel,
        beschreibung: generated.right.beschreibung,
        context: generated.right.context,
        mediaUrl: config.placeholderUrl,
        side: "right",
        depth: currentDepth + 1,
        parentId: nodeId,
        discovererHash: null,
      },
    }),
  ]);

  await prisma.treeNode.update({
    where: { id: nodeId },
    data: { generated: true, question: generated.question },
  });

  // Create image tasks for the new children
  const imageTasks = await prisma.imageTask.createManyAndReturn({
    data: [
      { sessionId, nodeId: leftChild.id, nodeTitel: leftChild.titel, status: "pending" },
      { sessionId, nodeId: rightChild.id, nodeTitel: rightChild.titel, status: "pending" },
    ],
  });

  // Process images inline
  await Promise.all(imageTasks.map((t) => processImageTaskById(t.id)));

  // Enqueue deeper pre-generation
  for (const child of [leftChild, rightChild]) {
    await prisma.jobQueue.create({
      data: {
        type: "pre-generation",
        payload: {
          nodeId: child.id,
          sessionId,
          currentDepth: currentDepth + 1,
          config,
        },
      },
    });
  }
}
