import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  const vote = await prisma.vote.findUnique({
    where: { treeId_treeVersion_voterHash: { treeId, treeVersion, voterHash } },
    select: { optionId: true },
  });

  return NextResponse.json({ optionId: vote?.optionId ?? null });
}
