/**
 * Shared image task processor — used both by the standalone worker (worker.ts)
 * and inline in API routes (for npm run dev / Vercel where no worker runs).
 *
 * Each function processes a single ImageTask by its ID, using optimistic
 * status checks to avoid conflicts when both worker and inline processing
 * are active simultaneously.
 */

import { prisma } from "@/lib/prisma";
import { generateNodeImage, buildImagePrompt } from "@/lib/imageGen";

/**
 * Attempt to claim and process a single ImageTask.
 * Returns true if the task was processed (or already done), false if not found/skipped.
 */
export async function processImageTaskById(taskId: string): Promise<boolean> {
  // Optimistic claim: only process if still pending
  const { count } = await prisma.imageTask.updateMany({
    where: { id: taskId, status: "pending" },
    data: { status: "generating", startedAt: new Date() },
  });

  // Another process already claimed it (worker or previous inline call)
  if (count === 0) return false;

  const task = await prisma.imageTask.findUnique({ where: { id: taskId } });
  if (!task) return false;

  const [node, session] = await Promise.all([
    prisma.treeNode.findUnique({ where: { id: task.nodeId } }),
    prisma.votingSession.findUnique({ where: { id: task.sessionId } }),
  ]);

  if (!node || !session) {
    await prisma.imageTask.update({
      where: { id: task.id },
      data: { status: "failed", error: "Node or session not found", completedAt: new Date() },
    });
    return true;
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

  return true;
}

/**
 * Fire-and-forget: process image tasks for the given IDs.
 * Skipped on Vercel (10s timeout too short for image generation).
 * Logs errors but never throws — safe to call without awaiting.
 */
export function processImageTasksInBackground(taskIds: string[]): void {
  if (process.env.VERCEL) return; // Worker on Railway handles these
  Promise.all(taskIds.map((id) => processImageTaskById(id))).catch((err) => {
    console.error("[processImageTask] Background processing error:", err);
  });
}
