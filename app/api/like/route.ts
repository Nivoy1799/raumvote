import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { treeId, treeVersion, optionId, voterId } = body;

  const existing = await prisma.like.findUnique({
    where: {
      treeId_treeVersion_optionId_voterId: {
        treeId,
        treeVersion,
        optionId,
        voterId,
      },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({
    data: { treeId, treeVersion, optionId, voterId },
  });

  return NextResponse.json({ liked: true });
}
