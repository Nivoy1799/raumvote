import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const optionId = searchParams.get("optionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!sessionId || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  const like = await prisma.like.findUnique({
    where: {
      sessionId_optionId_voterHash: { sessionId, optionId, voterHash },
    },
    select: { id: true },
  });

  return NextResponse.json({ liked: !!like });
}
