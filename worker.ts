/**
 * Standalone background worker that polls the Postgres job queue.
 * Run with: npx tsx worker.ts
 *
 * Processes two job types:
 * 1. "image-process" — picks up pending ImageTasks and generates images
 * 2. "pre-generation" — recursively generates tree descendants
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const POLL_INTERVAL = 2000; // 2 seconds
const IMAGE_BATCH_SIZE = 3; // Process up to 3 images concurrently

// ── Image processing (uses existing ImageTask table) ──

async function processImageTasks(): Promise<number> {
  // Claim pending image tasks using SKIP LOCKED
  const tasks = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "ImageTask"
    WHERE status = 'pending'
    ORDER BY "createdAt" ASC
    LIMIT ${IMAGE_BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `;

  if (tasks.length === 0) return 0;

  // Mark as generating
  await prisma.imageTask.updateMany({
    where: { id: { in: tasks.map((t) => t.id) } },
    data: { status: "generating", startedAt: new Date() },
  });

  const fullTasks = await prisma.imageTask.findMany({
    where: { id: { in: tasks.map((t) => t.id) } },
  });

  // Lazy import image generation (heavy dependencies)
  const { generateNodeImage, buildImagePrompt } = await import("./lib/imageGen");

  await Promise.all(
    fullTasks.map(async (task) => {
      const node = await prisma.treeNode.findUnique({ where: { id: task.nodeId } });
      const session = await prisma.votingSession.findUnique({ where: { id: task.sessionId } });
      if (!node || !session) {
        await prisma.imageTask.update({
          where: { id: task.id },
          data: { status: "failed", error: "Node or session not found", completedAt: new Date() },
        });
        return;
      }

      try {
        const prompt = buildImagePrompt(node, session.imagePrompt);
        const imageConfig = {
          imageModel: session.imageModel,
          imagePrompt: session.imagePrompt,
          referenceMedia: session.referenceMedia,
        };
        const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
        if (imgUrl) {
          await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
          await prisma.imageTask.update({
            where: { id: task.id },
            data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() },
          });
        } else {
          await prisma.imageTask.update({
            where: { id: task.id },
            data: { status: "failed", error: "Generation returned null", completedAt: new Date() },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.imageTask.update({
          where: { id: task.id },
          data: { status: "failed", error: msg, completedAt: new Date() },
        });
      }
    }),
  );

  return fullTasks.length;
}

// ── Job queue processing (pre-generation etc.) ──

async function processJobQueue(): Promise<number> {
  const jobs = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "JobQueue"
    WHERE status = 'pending' AND attempts < "maxAttempts"
    ORDER BY "createdAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  if (jobs.length === 0) return 0;

  const job = await prisma.jobQueue.update({
    where: { id: jobs[0].id },
    data: { status: "processing", startedAt: new Date(), attempts: { increment: 1 } },
  });

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
    const canRetry = job.attempts < job.maxAttempts;
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

  return 1;
}

// ── Pre-generation handler ──

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

  const { generateTreeNodes } = await import("./lib/openai");

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

  // Create image tasks for the new children (worker will pick them up)
  await prisma.imageTask.createMany({
    data: [
      { sessionId, nodeId: leftChild.id, nodeTitel: leftChild.titel, status: "pending" },
      { sessionId, nodeId: rightChild.id, nodeTitel: rightChild.titel, status: "pending" },
    ],
  });

  // Enqueue deeper pre-generation as new jobs
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

// ── Main loop ──

let running = true;

async function pollLoop() {
  console.log("[worker] Started — polling every", POLL_INTERVAL, "ms");

  while (running) {
    try {
      const images = await processImageTasks();
      const jobs = await processJobQueue();

      if (images > 0 || jobs > 0) {
        console.log(`[worker] Processed ${images} image tasks, ${jobs} queue jobs`);
      }
    } catch (err) {
      console.error("[worker] Poll error:", err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  console.log("[worker] Stopped");
  await prisma.$disconnect();
  pool.end();
}

process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});

pollLoop();
