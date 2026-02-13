import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const optionId = searchParams.get("optionId") ?? "";

  if (!treeId || !treeVersion || !optionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const count = await prisma.comment.count({
    where: { treeId, treeVersion, optionId },
  });

  return NextResponse.json({ count });
}
