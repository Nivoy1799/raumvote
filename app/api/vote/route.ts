import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function POST(req: Request) {
  const body = await req.json();
  const { treeId, treeVersion, optionId, voterId } = body;

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getActiveSession();
  if (!session || !isSessionOpen(session)) {
    return NextResponse.json({ error: "Voting period closed" }, { status: 403 });
  }

  const voterHash = hashVoterId(voterId);

  const existing = await prisma.vote.findUnique({
    where: { treeId_treeVersion_voterHash: { treeId, treeVersion, voterHash } },
  });

  if (existing && existing.optionId === optionId) {
    await prisma.vote.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, optionId: null });
  }

  await prisma.vote.upsert({
    where: { treeId_treeVersion_voterHash: { treeId, treeVersion, voterHash } },
    create: { treeId, treeVersion, voterHash, optionId },
    update: { optionId },
  });

  return NextResponse.json({ ok: true, optionId });
}
