import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { treeId, treeVersion, voterId, optionId } = body;

  if (!treeId || !treeVersion || !voterId || !optionId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  await prisma.vote.upsert({
    where: {
      treeId_treeVersion_voterId: {
        treeId,
        treeVersion,
        voterId,
      },
    },
    update: { optionId },
    create: { treeId, treeVersion, voterId, optionId },
  });

  return NextResponse.json({ ok: true });
}
