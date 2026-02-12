import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const optionId = searchParams.get("optionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const like = await prisma.like.findUnique({
    where: {
      treeId_treeVersion_optionId_voterId: { treeId, treeVersion, optionId, voterId },
    },
    select: { id: true },
  });

  return NextResponse.json({ liked: !!like });
}
