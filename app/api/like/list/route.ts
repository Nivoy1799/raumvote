import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voterId = searchParams.get("voterId") ?? "";

  if (!voterId) {
    return NextResponse.json({ error: "Missing voterId" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  const likes = await prisma.like.findMany({
    where: { voterHash },
    orderBy: { createdAt: "desc" },
  });

  if (likes.length === 0) {
    return NextResponse.json({ likes: [] });
  }

  const nodeIds = likes.map((l) => l.optionId);
  const nodes = await prisma.treeNode.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, titel: true, beschreibung: true, mediaUrl: true, parentId: true, depth: true },
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const result = likes.map((l) => ({
    id: l.id,
    treeId: l.treeId,
    optionId: l.optionId,
    createdAt: l.createdAt,
    node: nodeMap.get(l.optionId) ?? null,
  }));

  return NextResponse.json({ likes: result });
}
