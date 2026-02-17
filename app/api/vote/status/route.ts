import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!sessionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  const vote = await prisma.vote.findUnique({
    where: { sessionId_voterHash: { sessionId, voterHash } },
    select: { optionId: true },
  });

  return NextResponse.json({ optionId: vote?.optionId ?? null });
}
