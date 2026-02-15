import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";

  if (!nodeId) {
    return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
  }

  const node = await prisma.treeNode.findUnique({
    where: { id: nodeId },
  });

  if (!node) {
    return NextResponse.json({ error: "Unknown nodeId" }, { status: 404 });
  }

  // Increment visit count (fire-and-forget)
  prisma.treeNode.update({
    where: { id: nodeId },
    data: { amountVisits: { increment: 1 } },
  }).catch(() => {});

  // Fetch children if generated
  let left = null;
  let right = null;

  if (node.generated) {
    const children = await prisma.treeNode.findMany({
      where: { parentId: nodeId },
    });
    left = children.find((c) => c.side === "left") ?? null;
    right = children.find((c) => c.side === "right") ?? null;
  }

  return NextResponse.json({ node, left, right });
}
