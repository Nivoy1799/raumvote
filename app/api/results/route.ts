import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";

  if (!treeId || !treeVersion) {
    return NextResponse.json({ error: "Missing treeId/treeVersion" }, { status: 400 });
  }

  const grouped = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { treeId, treeVersion },
    _count: { optionId: true },
    orderBy: { _count: { optionId: "desc" } },
    take: 20,
  });

  const totalVotes = await prisma.vote.count({ where: { treeId, treeVersion } });

  return NextResponse.json({
    treeId,
    treeVersion,
    totalVotes,
    leaderboard: grouped.map((g) => ({
      optionId: g.optionId,
      count: g._count.optionId,
    })),
  });
}
