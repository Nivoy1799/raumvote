import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkR2Health } from "@/lib/r2";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// List image tasks with stats
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || "50")), 200);
  const filterStatus = url.searchParams.get("status") || undefined;
  const filterTitle = url.searchParams.get("title") || undefined;
  const sortField = url.searchParams.get("sort") || "createdAt";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" as const : "desc" as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = sessionId ? { sessionId } : {};
  if (filterStatus) where.status = filterStatus;
  if (filterTitle) where.nodeTitel = { contains: filterTitle, mode: "insensitive" };

  // Build dynamic orderBy
  const validSorts = ["createdAt", "status", "completedAt", "startedAt"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any[] = validSorts.includes(sortField)
    ? [{ [sortField]: sortField === "completedAt" || sortField === "startedAt"
        ? { sort: sortDir, nulls: "last" }
        : sortDir }]
    : [{ createdAt: "desc" }];

  // Auto-mark tasks stuck in "generating" for >5 minutes as failed
  const stuckCutoff = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.imageTask.updateMany({
    where: {
      ...(sessionId ? { sessionId } : {}),
      status: "generating",
      startedAt: { lt: stuckCutoff },
    },
    data: { status: "failed", error: "Stuck — timed out after 5 minutes", completedAt: new Date() },
  });

  const [tasks, total, counts] = await Promise.all([
    prisma.imageTask.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.imageTask.count({ where }),
    prisma.imageTask.groupBy({
      by: ["status"],
      where: sessionId ? { sessionId } : {},
      _count: true,
    }),
  ]);

  const stats = { pending: 0, generating: 0, completed: 0, failed: 0 };
  for (const c of counts) {
    stats[c.status as keyof typeof stats] = c._count;
  }

  return NextResponse.json({ tasks, stats, total, page, pageSize });
}

// Retry failed tasks
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, taskId, sessionId } = body;

  if (action === "retry" && taskId) {
    const task = await prisma.imageTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "failed") {
      return NextResponse.json({ error: "Task not found or not failed" }, { status: 400 });
    }

    await prisma.imageTask.update({
      where: { id: taskId },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });

    const { generateNodeImage, buildImagePrompt } = await import("@/lib/imageGen");
    const node = await prisma.treeNode.findUnique({ where: { id: task.nodeId } });
    const session = await prisma.votingSession.findUnique({ where: { id: task.sessionId } });
    if (!node || !session) {
      return NextResponse.json({ error: "Node or session not found" }, { status: 404 });
    }

    const imageConfig = {
      imageModel: session.imageModel,
      imagePrompt: session.imagePrompt,
      referenceMedia: session.referenceMedia,
    };

    after(async () => {
      await prisma.imageTask.update({ where: { id: taskId }, data: { status: "generating", startedAt: new Date() } });
      try {
        const prompt = buildImagePrompt(node, session.imagePrompt);
        const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
        if (imgUrl) {
          await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
          await prisma.imageTask.update({ where: { id: taskId }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
        } else {
          await prisma.imageTask.update({ where: { id: taskId }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.imageTask.update({ where: { id: taskId }, data: { status: "failed", error: msg, completedAt: new Date() } });
      }
    });

    return NextResponse.json({ ok: true, message: "Retry started" });
  }

  if (action === "retry-all-failed" && sessionId) {
    const r2 = await checkR2Health();
    if (!r2.ok) {
      return NextResponse.json({ error: `R2 nicht erreichbar: ${r2.error}` }, { status: 503 });
    }

    const failedTasks = await prisma.imageTask.findMany({
      where: { sessionId, status: "failed" },
    });

    if (failedTasks.length === 0) {
      return NextResponse.json({ ok: true, retried: 0 });
    }

    const { generateNodeImage, buildImagePrompt } = await import("@/lib/imageGen");
    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const imageConfig = {
      imageModel: session.imageModel,
      imagePrompt: session.imagePrompt,
      referenceMedia: session.referenceMedia,
    };

    await prisma.imageTask.updateMany({
      where: { sessionId, status: "failed" },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });

    after(async () => {
      for (const task of failedTasks) {
        const node = await prisma.treeNode.findUnique({ where: { id: task.nodeId } });
        if (!node) continue;

        await prisma.imageTask.update({ where: { id: task.id }, data: { status: "generating", startedAt: new Date() } });
        try {
          const prompt = buildImagePrompt(node, session.imagePrompt);
          const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
          if (imgUrl) {
            await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
          } else {
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: msg, completedAt: new Date() } });
        }
      }
    });

    return NextResponse.json({ ok: true, retried: failedTasks.length });
  }

  if (action === "backfill" && sessionId) {
    const r2 = await checkR2Health();
    if (!r2.ok) {
      return NextResponse.json({ error: `R2 nicht erreichbar: ${r2.error}` }, { status: 503 });
    }

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existingTaskNodeIds = (
      await prisma.imageTask.findMany({ where: { sessionId }, select: { nodeId: true } })
    ).map((t) => t.nodeId);

    const nodesNeedingImages = await prisma.treeNode.findMany({
      where: {
        sessionId,
        id: { notIn: existingTaskNodeIds },
        OR: [
          { mediaUrl: session.placeholderUrl },
          { mediaUrl: null },
        ],
      },
    });

    if (nodesNeedingImages.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    await prisma.imageTask.createMany({
      data: nodesNeedingImages.map((node) => ({
        sessionId,
        nodeId: node.id,
        nodeTitel: node.titel,
        status: "pending",
      })),
    });

    const { generateNodeImage, buildImagePrompt } = await import("@/lib/imageGen");
    const imageConfig = {
      imageModel: session.imageModel,
      imagePrompt: session.imagePrompt,
      referenceMedia: session.referenceMedia,
    };

    after(async () => {
      const tasks = await prisma.imageTask.findMany({
        where: { sessionId, nodeId: { in: nodesNeedingImages.map((n) => n.id) }, status: "pending" },
      });

      for (const task of tasks) {
        const node = nodesNeedingImages.find((n) => n.id === task.nodeId);
        if (!node) continue;

        await prisma.imageTask.update({ where: { id: task.id }, data: { status: "generating", startedAt: new Date() } });
        try {
          const prompt = buildImagePrompt(node, session.imagePrompt);
          const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
          if (imgUrl) {
            await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
          } else {
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: msg, completedAt: new Date() } });
        }
      }
    });

    return NextResponse.json({ ok: true, created: nodesNeedingImages.length });
  }

  if (action === "restart-pending" && sessionId) {
    const r2 = await checkR2Health();
    if (!r2.ok) {
      return NextResponse.json({ error: `R2 nicht erreichbar: ${r2.error}` }, { status: 503 });
    }

    const pendingTasks = await prisma.imageTask.findMany({
      where: { sessionId, status: "pending" },
    });

    if (pendingTasks.length === 0) {
      return NextResponse.json({ ok: true, restarted: 0 });
    }

    const { generateNodeImage, buildImagePrompt } = await import("@/lib/imageGen");
    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const imageConfig = {
      imageModel: session.imageModel,
      imagePrompt: session.imagePrompt,
      referenceMedia: session.referenceMedia,
    };

    after(async () => {
      for (const task of pendingTasks) {
        const node = await prisma.treeNode.findUnique({ where: { id: task.nodeId } });
        if (!node) continue;

        await prisma.imageTask.update({ where: { id: task.id }, data: { status: "generating", startedAt: new Date() } });
        try {
          const prompt = buildImagePrompt(node, session.imagePrompt);
          const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
          if (imgUrl) {
            await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
          } else {
            await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: msg, completedAt: new Date() } });
        }
      }
    });

    return NextResponse.json({ ok: true, restarted: pendingTasks.length });
  }

  if (action === "clear-completed" && sessionId) {
    const result = await prisma.imageTask.deleteMany({
      where: { sessionId, status: "completed" },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
