import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const optionId = searchParams.get("optionId") ?? "";

  if (!sessionId || !optionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const like = await prisma.like.findUnique({
    where: {
      sessionId_optionId_voterHash: { sessionId, optionId, voterHash },
    },
    select: { id: true },
  });

  return NextResponse.json({ liked: !!like });
}
