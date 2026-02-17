import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const optionId = searchParams.get("optionId") ?? "";

  if (!sessionId || !optionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const count = await prisma.like.count({
    where: { sessionId, optionId },
  });

  return NextResponse.json({ count });
}
