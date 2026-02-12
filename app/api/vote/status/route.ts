import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const vote = await prisma.vote.findUnique({
    where: { treeId_treeVersion_voterId: { treeId, treeVersion, voterId } },
    select: { optionId: true },
  });

  return NextResponse.json({ optionId: vote?.optionId ?? null });
}
