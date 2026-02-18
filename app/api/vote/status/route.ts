import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vote = await prisma.vote.findUnique({
    where: { sessionId_voterHash: { sessionId, voterHash } },
    select: { optionId: true },
  });

  return NextResponse.json({ optionId: vote?.optionId ?? null });
}
