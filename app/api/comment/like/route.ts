import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function POST(req: Request) {
  const body = await req.json();
  const { commentId } = body;

  if (!commentId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req, body);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getActiveSession();
  if (!session || !isSessionOpen(session)) {
    return NextResponse.json({ error: "Voting period closed" }, { status: 403 });
  }

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
