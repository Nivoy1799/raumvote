import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = await prisma.votingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, title: true, status: true, startedAt: true, endedAt: true, durationDays: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Top 5 by vote count
  const grouped = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { sessionId },
    _count: { optionId: true },
    orderBy: { _count: { optionId: "desc" } },
    take: 5,
  });

  const totalVotes = await prisma.vote.count({ where: { sessionId } });

  const optionIds = grouped.map((g) => g.optionId);

  const nodes = await prisma.treeNode.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, titel: true, beschreibung: true, context: true, mediaUrl: true, depth: true },
  });

  const likeCounts = await prisma.like.groupBy({
    by: ["optionId"],
    where: { sessionId, optionId: { in: optionIds } },
    _count: { optionId: true },
  });

  const commentCounts = await prisma.comment.groupBy({
    by: ["optionId"],
    where: { sessionId, optionId: { in: optionIds } },
    _count: { optionId: true },
  });

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const likeMap = Object.fromEntries(likeCounts.map((l) => [l.optionId, l._count.optionId]));
  const commentMap = Object.fromEntries(commentCounts.map((c) => [c.optionId, c._count.optionId]));

  const top5 = grouped.map((g, idx) => {
    const node = nodeMap[g.optionId];
    return {
      rank: idx + 1,
      optionId: g.optionId,
      votes: g._count.optionId,
      percentage: totalVotes ? Math.round((g._count.optionId / totalVotes) * 100) : 0,
      likes: likeMap[g.optionId] ?? 0,
      comments: commentMap[g.optionId] ?? 0,
      titel: node?.titel ?? "—",
      beschreibung: node?.beschreibung ?? "",
      context: node?.context ?? "",
      mediaUrl: node?.mediaUrl ?? null,
      depth: node?.depth ?? 0,
    };
  });

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationDays: session.durationDays,
    },
    totalVotes,
    totalOptions: optionIds.length,
    top5,
    exportedAt: new Date().toISOString(),
  });
}
