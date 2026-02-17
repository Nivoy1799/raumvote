import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { treeId, rootTitel, rootBeschreibung, rootContext } = body;

  if (!treeId || !rootTitel || !rootBeschreibung) {
    return NextResponse.json(
      { error: "Missing required fields: treeId, rootTitel, rootBeschreibung" },
      { status: 400 }
    );
  }

  // Verify tree exists
  const tree = await prisma.treeConfig.findUnique({ where: { treeId } });
  if (!tree) {
    return NextResponse.json({ error: "Tree not found" }, { status: 404 });
  }

  try {
    // Delete all existing nodes for this tree
    await prisma.treeNode.deleteMany({
      where: { treeId },
    });

    // Create new root node
    const newRoot = await prisma.treeNode.create({
      data: {
        treeId,
        titel: rootTitel,
        beschreibung: rootBeschreibung,
        context: rootContext || "",
        mediaUrl: tree.placeholderUrl,
        side: null,
        depth: 0,
        generated: false,
        discovererHash: null,
      },
    });

    // Update tree config to point to new root
    await prisma.treeConfig.update({
      where: { treeId },
      data: {
        rootNodeId: newRoot.id,
      },
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
