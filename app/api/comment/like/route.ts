import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function POST(req: Request) {
  const body = await req.json();
  const { commentId, voterId } = body;

  if (!commentId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  const existing = await prisma.commentLike.findUnique({
    where: { commentId_voterHash: { commentId, voterHash } },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.commentLike.create({ data: { commentId, voterHash } });
  return NextResponse.json({ liked: true });
}
