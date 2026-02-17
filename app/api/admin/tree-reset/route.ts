import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, rootTitel, rootBeschreibung, rootContext } = body;

  if (!sessionId || !rootTitel || !rootBeschreibung) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, rootTitel, rootBeschreibung" },
      { status: 400 }
    );
  }

  const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    await prisma.treeNode.deleteMany({
      where: { sessionId },
    });

    const newRoot = await prisma.treeNode.create({
      data: {
        sessionId,
        titel: rootTitel,
        beschreibung: rootBeschreibung,
        context: rootContext || "",
        mediaUrl: session.placeholderUrl,
        side: null,
        depth: 0,
        generated: false,
        discovererHash: null,
      },
    });

    await prisma.votingSession.update({
      where: { id: sessionId },
      data: { rootNodeId: newRoot.id },
    });

    return NextResponse.json({
      success: true,
      message: "Tree reset successfully",
      rootNode: newRoot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to reset tree", details: message },
      { status: 500 }
    );
  }
}
