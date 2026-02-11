import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TREE, Choice } from "@/lib/tree";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const nodeId = body?.nodeId as string | undefined;
  const choice = body?.choice as Choice | undefined;

  if (!nodeId || !choice) {
    return NextResponse.json({ error: "Missing nodeId/choice" }, { status: 400 });
  }
  if (!TREE[nodeId]) {
    return NextResponse.json({ error: "Unknown nodeId" }, { status: 400 });
  }
  if (choice !== "left" && choice !== "right") {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }

  await prisma.vote.create({
    data: { nodeId, choice },
  });

  return NextResponse.json({ ok: true });
}
