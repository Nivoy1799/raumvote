import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionDeadline, remainingMs } from "@/lib/votingSession";

export async function GET() {
  // Return the most relevant session: active first, then most recent
  const session = await prisma.votingSession.findFirst({
    where: { status: { in: ["active", "draft"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // "active" < "draft" alphabetically
  });

  // Fallback: most recent finished/cancelled
  const resolved = session ?? await prisma.votingSession.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!resolved) {
    return NextResponse.json({ session: null });
  }

  const deadline = sessionDeadline(resolved);

  return NextResponse.json({
    session: {
      id: resolved.id,
      treeId: resolved.treeId,
      treeVersion: resolved.treeVersion,
      title: resolved.title,
      status: resolved.status,
      durationDays: resolved.durationDays,
      startedAt: resolved.startedAt,
      endedAt: resolved.endedAt,
      deadline: deadline?.toISOString() ?? null,
      remainingMs: resolved.status === "active" ? remainingMs(resolved) : 0,
    },
  });
}
