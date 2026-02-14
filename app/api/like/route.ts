import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function POST(req: Request) {
  const body = await req.json();
  const { treeId, treeVersion, optionId, voterId } = body;

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getActiveSession();
  if (!session || !isSessionOpen(session)) {
    return NextResponse.json({ error: "Voting period closed" }, { status: 403 });
  }

  const voterHash = hashVoterId(voterId);

  const existing = await prisma.like.findUnique({
    where: {
      treeId_treeVersion_optionId_voterHash: { treeId, treeVersion, optionId, voterHash },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    await prisma.like.create({ data: { treeId, treeVersion, optionId, voterHash } });
    return NextResponse.json({ liked: true });
  }
}
