import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";

export async function GET(req: Request) {
  const voterHash = await getVoterHash(req);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all nodes discovered by this user
  const discoveries = await prisma.treeNode.findMany({
    where: { discovererHash: voterHash },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titel: true,
      beschreibung: true,
      mediaUrl: true,
      depth: true,
      createdAt: true,
      parent: {
        select: {
          id: true,
          titel: true,
        },
      },
    },
  });

  return NextResponse.json({ discoveries });
}
