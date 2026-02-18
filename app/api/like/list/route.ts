import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";

export async function GET(req: Request) {
  const voterHash = await getVoterHash(req);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    sessionId: l.sessionId,
    optionId: l.optionId,
    createdAt: l.createdAt,
    node: nodeMap.get(l.optionId) ?? null,
  }));

  return NextResponse.json({ likes: result });
}
