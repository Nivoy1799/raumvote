import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function POST(req: Request) {
  const body = await req.json();
  const { nodeId, voterId } = body;

  if (!nodeId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const isFirstExplorer = !node.discoveredAt;

  if (isFirstExplorer) {
    await prisma.treeNode.update({
      where: { id: nodeId },
      data: {
        discoveredAt: new Date(),
        discovererHash: node.discovererHash ?? voterHash,
      },
    });
  }

  return NextResponse.json({
    discovered: true,
    isFirstExplorer,
  });
}
