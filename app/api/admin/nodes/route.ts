import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// List nodes with image task status and stats
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize") || "50")), 200);
  const sort = url.searchParams.get("sort") || "depth";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const search = url.searchParams.get("search") || undefined;
  const filterDepthMin = url.searchParams.get("filterDepthMin");
  const filterDepthMax = url.searchParams.get("filterDepthMax");
  const filterImageStatus = url.searchParams.get("filterImageStatus") || undefined;
  const filterDiscovered = url.searchParams.get("filterDiscovered") || undefined;
  const filterGenerated = url.searchParams.get("filterGenerated") || undefined;

  // Build where clause
  const where: Prisma.TreeNodeWhereInput = { sessionId };

  if (filterDepthMin) where.depth = { ...(where.depth as object), gte: Number(filterDepthMin) };
  if (filterDepthMax) where.depth = { ...(where.depth as object), lte: Number(filterDepthMax) };
  if (filterGenerated === "true") where.generated = true;
  if (filterGenerated === "false") where.generated = false;
  if (filterDiscovered === "true") where.discovererHash = { not: null };
  if (filterDiscovered === "false") where.discovererHash = null;

  if (search) {
    where.OR = [
      { titel: { contains: search, mode: "insensitive" } },
      { beschreibung: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }

  // Image status filter requires pre-querying ImageTask
  if (filterImageStatus) {
    if (filterImageStatus === "none") {
      const nodesWithTasks = await prisma.imageTask.findMany({
        where: { sessionId },
        select: { nodeId: true },
        distinct: ["nodeId"],
      });
      where.id = { notIn: nodesWithTasks.map((t) => t.nodeId) };
    } else {
      const matchingTasks = await prisma.imageTask.findMany({
        where: { sessionId, status: filterImageStatus },
        select: { nodeId: true },
        distinct: ["nodeId"],
      });
      where.id = { in: matchingTasks.map((t) => t.nodeId) };
    }
  }

  // Validate sort field
  const allowedSorts = ["titel", "depth", "amountVisits", "discoveredAt", "side", "createdAt"];
  const orderField = allowedSorts.includes(sort) ? sort : "depth";

  const [nodes, total, totalNodes, discovered, generated, maxDepthResult, nodesWithImage] = await Promise.all([
    prisma.treeNode.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.treeNode.count({ where }),
    prisma.treeNode.count({ where: { sessionId } }),
    prisma.treeNode.count({ where: { sessionId, discovererHash: { not: null } } }),
    prisma.treeNode.count({ where: { sessionId, generated: true } }),
    prisma.treeNode.aggregate({ where: { sessionId }, _max: { depth: true } }),
    prisma.imageTask.findMany({
      where: { sessionId, status: "completed" },
      select: { nodeId: true },
      distinct: ["nodeId"],
    }),
  ]);

  // Join latest image task per node
  const nodeIds = nodes.map((n) => n.id);
  const imageTasks =
    nodeIds.length > 0
      ? await prisma.imageTask.findMany({
          where: { nodeId: { in: nodeIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const latestTaskByNode = new Map<string, (typeof imageTasks)[0]>();
  for (const task of imageTasks) {
    if (!latestTaskByNode.has(task.nodeId)) {
      latestTaskByNode.set(task.nodeId, task);
    }
  }

  const nodesWithTasks = nodes.map((node) => {
    const task = latestTaskByNode.get(node.id);
    return {
      ...node,
      imageTask: task ? { id: task.id, status: task.status, imageUrl: task.imageUrl, error: task.error } : null,
    };
  });

  const stats = {
    totalNodes,
    discovered,
    undiscovered: totalNodes - discovered,
    withImage: nodesWithImage.length,
    withoutImage: totalNodes - nodesWithImage.length,
    generated,
    maxDepth: maxDepthResult._max.depth ?? 0,
  };

  return NextResponse.json({ nodes: nodesWithTasks, total, page, pageSize, stats });
}

// Bulk actions on nodes
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, nodeId, nodeIds, sessionId } = body;

  if (action === "regenerate-image" && nodeId && sessionId) {
    const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
    if (!node || node.sessionId !== sessionId) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // Create pending task — worker will pick it up
    const task = await prisma.imageTask.create({
      data: { sessionId, nodeId, nodeTitel: node.titel, status: "pending" },
    });

    return NextResponse.json({ ok: true, taskId: task.id });
  }

  if (action === "regenerate-images-bulk" && nodeIds?.length && sessionId) {
    const nodes = await prisma.treeNode.findMany({
      where: { id: { in: nodeIds }, sessionId },
    });

    if (nodes.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    // Create pending tasks — worker will pick them up
    await prisma.imageTask.createMany({
      data: nodes.map((n) => ({
        sessionId,
        nodeId: n.id,
        nodeTitel: n.titel,
        status: "pending",
      })),
    });

    return NextResponse.json({ ok: true, created: nodes.length });
  }

  if (action === "update-node" && nodeId && sessionId) {
    const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
    if (!node || node.sessionId !== sessionId) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.titel === "string") data.titel = body.titel.trim();
    if (typeof body.beschreibung === "string") data.beschreibung = body.beschreibung.trim();
    if (typeof body.context === "string") data.context = body.context;
    if (typeof body.question === "string") data.question = body.question.trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.treeNode.update({ where: { id: nodeId }, data });
    return NextResponse.json({ ok: true, node: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
