import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";

export async function POST(req: Request) {
  const body = await req.json();
  const { nodeId } = body;

  if (!nodeId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req, body);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
