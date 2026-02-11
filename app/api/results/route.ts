import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TREE } from "@/lib/tree";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("nodeId") ?? "";

  if (!TREE[nodeId]) {
    return NextResponse.json({ error: "Unknown nodeId" }, { status: 400 });
  }

  const [leftCount, rightCount] = await Promise.all([
    prisma.vote.count({ where: { nodeId, choice: "left" } }),
    prisma.vote.count({ where: { nodeId, choice: "right" } }),
  ]);

  const total = leftCount + rightCount;
  return NextResponse.json({
    nodeId,
    leftCount,
    rightCount,
    total,
    leftPct: total ? Math.round((leftCount / total) * 100) : 0,
    rightPct: total ? Math.round((rightCount / total) * 100) : 0,
  });
}
