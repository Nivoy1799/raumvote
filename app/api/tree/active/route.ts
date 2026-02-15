import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.treeConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!config || !config.rootNodeId) {
    return NextResponse.json({ error: "No active tree configured" }, { status: 404 });
  }

  return NextResponse.json({
    treeId: config.treeId,
    rootNodeId: config.rootNodeId,
    placeholderUrl: config.placeholderUrl,
  });
}
