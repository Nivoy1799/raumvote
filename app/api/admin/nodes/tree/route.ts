import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// Get all nodes for tree view (flat list, client builds hierarchy)
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const [session, nodes, imageTasks] = await Promise.all([
    prisma.votingSession.findUnique({ where: { id: sessionId }, select: { rootNodeId: true } }),
    prisma.treeNode.findMany({
      where: { sessionId },
      orderBy: [{ depth: "asc" }, { side: "asc" }],
    }),
    prisma.imageTask.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build latest task map
  const latestTaskByNode = new Map<string, string>();
  for (const task of imageTasks) {
    if (!latestTaskByNode.has(task.nodeId)) {
      latestTaskByNode.set(task.nodeId, task.status);
    }
  }

  const nodesWithStatus = nodes.map((n) => ({
    id: n.id,
    titel: n.titel,
    beschreibung: n.beschreibung,
    side: n.side,
    depth: n.depth,
    amountVisits: n.amountVisits,
    generated: n.generated,
    discovererHash: n.discovererHash,
    discoveredAt: n.discoveredAt,
    mediaUrl: n.mediaUrl,
    parentId: n.parentId,
    createdAt: n.createdAt,
    imageStatus: latestTaskByNode.get(n.id) ?? "none",
  }));

  return NextResponse.json({
    nodes: nodesWithStatus,
    rootNodeId: session?.rootNodeId ?? null,
  });
}
