import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leftId = searchParams.get("leftId");
  const rightId = searchParams.get("rightId");

  if (!leftId || !rightId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const [left, right] = await Promise.all([
    prisma.treeNode.findUnique({ where: { id: leftId }, select: { id: true, mediaUrl: true } }),
    prisma.treeNode.findUnique({ where: { id: rightId }, select: { id: true, mediaUrl: true } }),
  ]);

  return NextResponse.json({
    left: left ? { id: left.id, mediaUrl: left.mediaUrl } : null,
    right: right ? { id: right.id, mediaUrl: right.mediaUrl } : null,
  });
}
