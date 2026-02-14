import { prisma } from "@/lib/prisma";
import type { VotingSession } from "@prisma/client";

export async function getActiveSession(): Promise<VotingSession | null> {
  return prisma.votingSession.findFirst({
    where: { status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

export function sessionDeadline(session: VotingSession): Date | null {
  if (!session.startedAt) return null;
  const deadline = new Date(session.startedAt);
  deadline.setDate(deadline.getDate() + session.durationDays);
  return deadline;
}

export function isSessionOpen(session: VotingSession): boolean {
  if (session.status !== "active") return false;
  const deadline = sessionDeadline(session);
  if (!deadline) return false;
  return Date.now() < deadline.getTime();
}

export function remainingMs(session: VotingSession): number {
  const deadline = sessionDeadline(session);
  if (!deadline) return 0;
  return Math.max(0, deadline.getTime() - Date.now());
}
