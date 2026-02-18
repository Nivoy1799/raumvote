import { NextResponse } from "next/server";
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
  const sortDir = url.searchParams.get("sortDir") === "asc" ? ("asc" as const) : ("desc" as const);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = sessionId ? { sessionId } : {};
  if (filterStatus) where.status = filterStatus;
  if (filterTitle) where.nodeTitel = { contains: filterTitle, mode: "insensitive" };

  // Build dynamic orderBy
  const validSorts = ["createdAt", "status", "completedAt", "startedAt"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any[] = validSorts.includes(sortField)
    ? [
        {
          [sortField]:
            sortField === "completedAt" || sortField === "startedAt" ? { sort: sortDir, nulls: "last" } : sortDir,
        },
      ]
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

// Actions on image tasks — all just set status to "pending", worker processes them
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

    // Reset to pending — worker will pick it up
    await prisma.imageTask.update({
      where: { id: taskId },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });

    return NextResponse.json({ ok: true, message: "Retry queued" });
  }

  if (action === "retry-all-failed" && sessionId) {
    const r2 = await checkR2Health();
    if (!r2.ok) {
      return NextResponse.json({ error: `R2 nicht erreichbar: ${r2.error}` }, { status: 503 });
    }

    const result = await prisma.imageTask.updateMany({
      where: { sessionId, status: "failed" },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });

    return NextResponse.json({ ok: true, retried: result.count });
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
        OR: [{ mediaUrl: session.placeholderUrl }, { mediaUrl: null }],
      },
    });

    if (nodesNeedingImages.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    // Create pending tasks — worker will pick them up
    await prisma.imageTask.createMany({
      data: nodesNeedingImages.map((node) => ({
        sessionId,
        nodeId: node.id,
        nodeTitel: node.titel,
        status: "pending",
      })),
    });

    return NextResponse.json({ ok: true, created: nodesNeedingImages.length });
  }

  if (action === "restart-pending" && sessionId) {
    // Pending tasks are already in queue for the worker — nothing to do
    // But reset any that might have gotten stuck
    await prisma.imageTask.updateMany({
      where: { sessionId, status: "generating" },
      data: { status: "pending", startedAt: null },
    });

    return NextResponse.json({ ok: true, message: "Reset stuck tasks to pending" });
  }

  if (action === "clear-completed" && sessionId) {
    const result = await prisma.imageTask.deleteMany({
      where: { sessionId, status: "completed" },
    });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
