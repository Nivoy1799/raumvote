import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const voterId = url.searchParams.get("voterId");

  if (!voterId) {
    return NextResponse.json({ error: "Missing voterId" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

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
