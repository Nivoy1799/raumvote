import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const grouped = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { sessionId },
    _count: { optionId: true },
    orderBy: { _count: { optionId: "desc" } },
    take: 20,
  });

  const totalVotes = await prisma.vote.count({ where: { sessionId } });

  return NextResponse.json({
    sessionId,
    totalVotes,
    leaderboard: grouped.map((g) => ({
      optionId: g.optionId,
      count: g._count.optionId,
    })),
  });
}
