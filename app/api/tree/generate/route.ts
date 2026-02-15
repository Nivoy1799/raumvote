import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TreeNode } from "@prisma/client";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";
import { generateTreeNodes } from "@/lib/openai";
import type { EpisodeStep } from "@/lib/openai";
import { generateNodeImage, buildImagePrompt } from "@/lib/imageGen";

async function buildEpisode(nodeId: string): Promise<EpisodeStep[]> {
  const path: EpisodeStep[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const found: TreeNode | null = await prisma.treeNode.findUnique({ where: { id: currentId } });
    if (!found) break;
    path.unshift({
      titel: found.titel,
      beschreibung: found.beschreibung,
      context: found.context,
      side: found.side,
    });
    currentId = found.parentId;
  }

  return path;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { nodeId, voterId } = body;

  if (!nodeId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  // Check node exists and is not yet generated (race-condition safe)
  const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  // If already generated, return existing children
  if (node.generated) {
    const children = await prisma.treeNode.findMany({ where: { parentId: nodeId } });
    const left = children.find((c) => c.side === "left") ?? null;
    const right = children.find((c) => c.side === "right") ?? null;
    return NextResponse.json({
      node,
      left,
      right,
      isDiscoverer: false,
    });
  }

  // Fetch tree config for system prompt
  const config = await prisma.treeConfig.findUnique({ where: { treeId: node.treeId } });
  if (!config) {
    return NextResponse.json({ error: "Tree config not found" }, { status: 500 });
  }

  console.log("[generate] config.discoveryEnabled =", config.discoveryEnabled, "treeId =", config.treeId);

  if (!config.discoveryEnabled) {
    return NextResponse.json({ error: "Discovery is currently disabled" }, { status: 403 });
  }

  // Build episode and call OpenAI
  const episode = await buildEpisode(nodeId);
  const generated = await generateTreeNodes(config.systemPrompt, episode, config.modelName);

  // Create children + update parent in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Double-check not generated (race condition guard)
    const fresh = await tx.treeNode.findUnique({ where: { id: nodeId } });
    if (fresh?.generated) {
      const children = await tx.treeNode.findMany({ where: { parentId: nodeId } });
      return {
        node: fresh,
        left: children.find((c) => c.side === "left") ?? null,
        right: children.find((c) => c.side === "right") ?? null,
        isDiscoverer: false,
      };
    }

    const leftChild = await tx.treeNode.create({
      data: {
        treeId: node.treeId,
        titel: generated.left.titel,
        beschreibung: generated.left.beschreibung,
        context: generated.left.context,
        mediaUrl: config.placeholderUrl,
        side: "left",
        depth: node.depth + 1,
        parentId: nodeId,
        discovererHash: voterHash,
      },
    });

    const rightChild = await tx.treeNode.create({
      data: {
        treeId: node.treeId,
        titel: generated.right.titel,
        beschreibung: generated.right.beschreibung,
        context: generated.right.context,
        mediaUrl: config.placeholderUrl,
        side: "right",
        depth: node.depth + 1,
        parentId: nodeId,
        discovererHash: voterHash,
      },
    });

    const updatedNode = await tx.treeNode.update({
      where: { id: nodeId },
      data: {
        generated: true,
        question: generated.question,
      },
    });

    return {
      node: updatedNode,
      left: leftChild,
      right: rightChild,
      isDiscoverer: true,
    };
  });

  // Fire-and-forget image generation (don't block the response)
  if (result.isDiscoverer && result.left && result.right) {
    const leftId = result.left.id;
    const rightId = result.right.id;
    const leftPrompt = buildImagePrompt(result.left, config.imagePrompt);
    const rightPrompt = buildImagePrompt(result.right, config.imagePrompt);
    const imageConfig = {
      imageModel: config.imageModel,
      imagePrompt: config.imagePrompt,
      referenceMedia: config.referenceMedia,
    };
    void (async () => {
      try {
        const [leftImg, rightImg] = await Promise.all([
          generateNodeImage(leftPrompt, leftId, imageConfig),
          generateNodeImage(rightPrompt, rightId, imageConfig),
        ]);
        if (leftImg) await prisma.treeNode.update({ where: { id: leftId }, data: { mediaUrl: leftImg } });
        if (rightImg) await prisma.treeNode.update({ where: { id: rightId }, data: { mediaUrl: rightImg } });
      } catch (err) {
        console.error("[generate] Background image generation failed:", err);
      }
    })();
  }

  return NextResponse.json(result);
}
