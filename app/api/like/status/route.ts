import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const optionId = searchParams.get("optionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  const like = await prisma.like.findUnique({
    where: {
      treeId_treeVersion_optionId_voterHash: { treeId, treeVersion, optionId, voterHash },
    },
    select: { id: true },
  });

  return NextResponse.json({ liked: !!like });
}
