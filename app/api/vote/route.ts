import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function POST(req: Request) {
  const body = await req.json();
  const { treeId, treeVersion, optionId, voterId } = body;

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  await prisma.vote.upsert({
    where: {
      treeId_treeVersion_voterHash: { treeId, treeVersion, voterHash },
    },
    create: { treeId, treeVersion, voterHash, optionId },
    update: { optionId }, // überschreibt die Wahl
  });

  return NextResponse.json({ ok: true });
}
