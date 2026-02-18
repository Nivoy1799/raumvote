import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TreeNode } from "@prisma/client";
import { getVoterHash } from "@/lib/getVoter";
import { generateTreeNodes } from "@/lib/openai";
import type { EpisodeStep } from "@/lib/openai";
import { checkR2Health } from "@/lib/r2";
import { enqueue } from "@/lib/queue";

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
  const { nodeId } = body;

  if (!nodeId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req, body);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  // If already generated, return existing children
  if (node.generated) {
    const [children, totalNodes] = await Promise.all([
      prisma.treeNode.findMany({ where: { parentId: nodeId } }),
      prisma.treeNode.count({ where: { sessionId: node.sessionId } }),
    ]);
    const left = children.find((c) => c.side === "left") ?? null;
    const right = children.find((c) => c.side === "right") ?? null;
    return NextResponse.json({
      node,
      left,
      right,
      isDiscoverer: false,
      totalNodes,
    });
  }

  // Fetch session for config
  const session = await prisma.votingSession.findUnique({ where: { id: node.sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 500 });
  }

  if (!session.discoveryEnabled) {
    return NextResponse.json({ error: "Discovery is currently disabled" }, { status: 403 });
  }

  if (session.status === "archived") {
    return NextResponse.json({ error: "Session is archived" }, { status: 403 });
  }

  // Build episode and call OpenAI for immediate children
  const episode = await buildEpisode(nodeId);
  const generated = await generateTreeNodes(session.systemPrompt, episode, session.modelName);

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.treeNode.findUnique({ where: { id: nodeId } });
    if (fresh?.generated) {
      const [children, totalNodes] = await Promise.all([
        tx.treeNode.findMany({ where: { parentId: nodeId } }),
        tx.treeNode.count({ where: { sessionId: node.sessionId } }),
      ]);
      return {
        node: fresh,
        left: children.find((c) => c.side === "left") ?? null,
        right: children.find((c) => c.side === "right") ?? null,
        isDiscoverer: false,
        totalNodes,
      };
    }

    const leftChild = await tx.treeNode.create({
      data: {
        sessionId: node.sessionId,
        titel: generated.left.titel,
        beschreibung: generated.left.beschreibung,
        context: generated.left.context,
        mediaUrl: session.placeholderUrl,
        side: "left",
        depth: node.depth + 1,
        parentId: nodeId,
        discovererHash: voterHash,
      },
    });

    const rightChild = await tx.treeNode.create({
      data: {
        sessionId: node.sessionId,
        titel: generated.right.titel,
        beschreibung: generated.right.beschreibung,
        context: generated.right.context,
        mediaUrl: session.placeholderUrl,
        side: "right",
        depth: node.depth + 1,
        parentId: nodeId,
        discovererHash: voterHash,
      },
    });

    const [updatedNode, totalNodes] = await Promise.all([
      tx.treeNode.update({
        where: { id: nodeId },
        data: {
          generated: true,
          question: generated.question,
        },
      }),
      tx.treeNode.count({ where: { sessionId: node.sessionId } }),
    ]);

    return {
      node: updatedNode,
      left: leftChild,
      right: rightChild,
      isDiscoverer: true,
      totalNodes,
    };
  });

  // Enqueue pre-generation of descendants (worker picks this up)
  const config = {
    systemPrompt: session.systemPrompt,
    modelName: session.modelName,
    placeholderUrl: session.placeholderUrl,
    imageModel: session.imageModel,
    imagePrompt: session.imagePrompt,
    referenceMedia: session.referenceMedia,
  };

  if (result.left) {
    await enqueue("pre-generation", {
      nodeId: result.left.id,
      sessionId: node.sessionId,
      currentDepth: node.depth + 1,
      config,
    });
  }
  if (result.right) {
    await enqueue("pre-generation", {
      nodeId: result.right.id,
      sessionId: node.sessionId,
      currentDepth: node.depth + 1,
      config,
    });
  }

  // Create image tasks (worker picks these up)
  if (result.isDiscoverer && result.left && result.right) {
    const r2Status = await checkR2Health();
    if (!r2Status.ok) {
      console.error("[generate] R2 health check failed, skipping image generation:", r2Status.error);
      return NextResponse.json(result);
    }

    await prisma.imageTask.createMany({
      data: [
        { sessionId: node.sessionId, nodeId: result.left.id, nodeTitel: result.left.titel, status: "pending" },
        { sessionId: node.sessionId, nodeId: result.right.id, nodeTitel: result.right.titel, status: "pending" },
      ],
    });
  }

  return NextResponse.json(result);
}
