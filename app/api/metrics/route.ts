import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [jobStats, imageStats, activeSession, tokenCount] = await Promise.all([
      prisma.jobQueue.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.imageTask.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.votingSession.findFirst({
        where: { status: "active" },
        select: {
          _count: {
            select: { votes: true, nodes: true, likes: true, comments: true },
          },
        },
      }),
      prisma.accessToken.count({ where: { active: true } }),
    ]);

    const jobs: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of jobStats) {
      jobs[row.status] = row._count;
    }

    const images: Record<string, number> = { pending: 0, generating: 0, completed: 0, failed: 0 };
    for (const row of imageStats) {
      images[row.status] = row._count;
    }

    const mem = process.memoryUsage();

    return NextResponse.json({
      instance: os.hostname(),
      uptime: Math.round(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      jobs,
      images,
      session: activeSession
        ? {
            votes: activeSession._count.votes,
            nodes: activeSession._count.nodes,
            likes: activeSession._count.likes,
            comments: activeSession._count.comments,
            tokens: tokenCount,
          }
        : { votes: 0, nodes: 0, likes: 0, comments: 0, tokens: tokenCount },
    });
  } catch {
    return NextResponse.json({ error: "metrics unavailable" }, { status: 503 });
  }
}
