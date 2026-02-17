import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await prisma.votingSession.findFirst({
    where: { status: "active" },
    orderBy: { startedAt: "desc" },
  });

  if (!session || !session.rootNodeId) {
    return NextResponse.json({ error: "No active tree configured" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    rootNodeId: session.rootNodeId,
    placeholderUrl: session.placeholderUrl,
  });
}
