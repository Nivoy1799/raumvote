import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, optionId } = body;

  if (!sessionId || !optionId) {
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

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.vote.findUnique({
      where: { sessionId_voterHash: { sessionId, voterHash } },
    });

    if (existing && existing.optionId === optionId) {
      await tx.vote.delete({ where: { id: existing.id } });
      return { ok: true, optionId: null };
    }

    await tx.vote.upsert({
      where: { sessionId_voterHash: { sessionId, voterHash } },
      create: { sessionId, voterHash, optionId },
      update: { optionId },
    });

    return { ok: true, optionId };
  });

  return NextResponse.json(result);
}
