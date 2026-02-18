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

  const existing = await prisma.like.findUnique({
    where: {
      sessionId_optionId_voterHash: { sessionId, optionId, voterHash },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    await prisma.like.create({ data: { sessionId, optionId, voterHash } });
    return NextResponse.json({ liked: true });
  }
}
