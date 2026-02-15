import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// Get current tree config
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.treeConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!config) {
    return NextResponse.json({ config: null });
  }

  // Fetch tree stats
  const totalNodes = await prisma.treeNode.count({ where: { treeId: config.treeId } });
  const maxDepthResult = await prisma.treeNode.aggregate({
    where: { treeId: config.treeId },
    _max: { depth: true },
  });
  const undiscovered = await prisma.treeNode.count({
    where: { treeId: config.treeId, discoveredAt: null, parentId: { not: null } },
  });
  const pendingImages = await prisma.treeNode.count({
    where: {
      treeId: config.treeId,
      OR: [
        { mediaUrl: null },
        { mediaUrl: config.placeholderUrl },
        { mediaUrl: "/media/placeholder.jpg" },
      ],
      parentId: { not: null }, // exclude root
    },
  });
  const withImages = await prisma.treeNode.count({
    where: {
      treeId: config.treeId,
      mediaUrl: { not: null, notIn: [config.placeholderUrl, "/media/placeholder.jpg"] },
      parentId: { not: null },
    },
  });

  return NextResponse.json({
    config,
    stats: {
      totalNodes,
      maxDepth: maxDepthResult._max.depth ?? 0,
      undiscovered,
      pendingImages,
      withImages,
    },
  });
}

// Create new tree with root node
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { treeId, title, systemPrompt, modelName, rootTitel, rootBeschreibung, rootContext } = body;

  if (!treeId || !systemPrompt || !rootTitel || !rootBeschreibung || !rootContext) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create root node + config in transaction
  const result = await prisma.$transaction(async (tx) => {
    const rootNode = await tx.treeNode.create({
      data: {
        treeId,
        titel: rootTitel,
        beschreibung: rootBeschreibung,
        context: rootContext,
        side: null,
        depth: 0,
        discoveredAt: new Date(),
      },
    });

    const config = await tx.treeConfig.create({
      data: {
        treeId,
        rootNodeId: rootNode.id,
        title: title || null,
        systemPrompt,
        modelName: modelName || "gpt-4o",
      },
    });

    return { config, rootNode };
  });

  return NextResponse.json(result);
}

// Update config (system prompt, model)
export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { treeId, systemPrompt, modelName, discoveryEnabled, imageModel, imagePrompt } = body;

  if (!treeId) {
    return NextResponse.json({ error: "Missing treeId" }, { status: 400 });
  }

  const data: Record<string, string | boolean | null> = {};
  if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
  if (modelName !== undefined) data.modelName = modelName;
  if (discoveryEnabled !== undefined) data.discoveryEnabled = !!discoveryEnabled;
  if (imageModel !== undefined) data.imageModel = imageModel;
  if (imagePrompt !== undefined) data.imagePrompt = imagePrompt || null;

  const config = await prisma.treeConfig.update({
    where: { treeId },
    data,
  });

  return NextResponse.json({ config });
}
