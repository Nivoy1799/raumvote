import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TreeNode } from "@prisma/client";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";
import { generateTreeNodes } from "@/lib/openai";
import type { EpisodeStep } from "@/lib/openai";
import { generateNodeImage, buildImagePrompt } from "@/lib/imageGen";
import { checkR2Health } from "@/lib/r2";

const PRE_LOAD_DEPTH = 5;

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

async function generateImageForNode(
  node: { id: string; titel: string; beschreibung: string; context: string },
  sessionId: string,
  imageConfig: { imageModel: string; imagePrompt: string | null; referenceMedia: string[] },
): Promise<void> {
  const task = await prisma.imageTask.create({
    data: { sessionId, nodeId: node.id, nodeTitel: node.titel, status: "pending" },
  });
  await prisma.imageTask.update({ where: { id: task.id }, data: { status: "generating", startedAt: new Date() } });
  try {
    const prompt = buildImagePrompt(node, imageConfig.imagePrompt);
    const imgUrl = await generateNodeImage(prompt, node.id, imageConfig);
    if (imgUrl) {
      await prisma.treeNode.update({ where: { id: node.id }, data: { mediaUrl: imgUrl } });
      await prisma.imageTask.update({ where: { id: task.id }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
    } else {
      await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.imageTask.update({ where: { id: task.id }, data: { status: "failed", error: msg, completedAt: new Date() } });
  }
}

async function preGenerateDescendants(
  nodeId: string,
  sessionId: string,
  currentDepth: number,
  config: { systemPrompt: string; modelName: string; placeholderUrl: string; imageModel: string; imagePrompt: string | null; referenceMedia: string[] },
): Promise<void> {
  if (currentDepth >= PRE_LOAD_DEPTH) return;

  const node = await prisma.treeNode.findUnique({ where: { id: nodeId } });
  if (!node || node.generated) return;

  try {
    const episode = await buildEpisode(nodeId);
    const generated = await generateTreeNodes(config.systemPrompt, episode, config.modelName);

    const [leftChild, rightChild] = await Promise.all([
      prisma.treeNode.create({
        data: {
          sessionId,
          titel: generated.left.titel,
          beschreibung: generated.left.beschreibung,
          context: generated.left.context,
          mediaUrl: config.placeholderUrl,
          side: "left",
          depth: currentDepth + 1,
          parentId: nodeId,
          discovererHash: null,
        },
      }),
      prisma.treeNode.create({
        data: {
          sessionId,
          titel: generated.right.titel,
          beschreibung: generated.right.beschreibung,
          context: generated.right.context,
          mediaUrl: config.placeholderUrl,
          side: "right",
          depth: currentDepth + 1,
          parentId: nodeId,
          discovererHash: null,
        },
      }),
    ]);

    await prisma.treeNode.update({
      where: { id: nodeId },
      data: {
        generated: true,
        question: generated.question,
      },
    });

    // Generate images for the new children
    const imageConfig = { imageModel: config.imageModel, imagePrompt: config.imagePrompt, referenceMedia: config.referenceMedia };
    await Promise.all([
      generateImageForNode(leftChild, sessionId, imageConfig),
      generateImageForNode(rightChild, sessionId, imageConfig),
    ]);

    // Continue pre-generating deeper descendants
    await Promise.all([
      preGenerateDescendants(leftChild.id, sessionId, currentDepth + 1, config),
      preGenerateDescendants(rightChild.id, sessionId, currentDepth + 1, config),
    ]);
  } catch (err) {
    console.error(`[preGenerate] Failed for node ${nodeId}:`, err);
  }
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

  // Fire-and-forget pre-generation of descendants
  after(async () => {
    console.log("[generate] Starting background pre-generation for nodeId =", nodeId);
    const config = { systemPrompt: session.systemPrompt, modelName: session.modelName, placeholderUrl: session.placeholderUrl, imageModel: session.imageModel, imagePrompt: session.imagePrompt, referenceMedia: session.referenceMedia };
    await Promise.all([
      preGenerateDescendants(result.left!.id, node.sessionId, node.depth + 2, config),
      preGenerateDescendants(result.right!.id, node.sessionId, node.depth + 2, config),
    ]);
    console.log("[generate] Finished pre-generation for nodeId =", nodeId);
  });

  // Fire-and-forget image generation with task tracking
  if (result.isDiscoverer && result.left && result.right) {
    const r2Status = await checkR2Health();
    if (!r2Status.ok) {
      console.error("[generate] R2 health check failed, skipping image generation:", r2Status.error);
      return NextResponse.json(result);
    }
    const leftId = result.left.id;
    const rightId = result.right.id;
    const leftPrompt = buildImagePrompt(result.left, session.imagePrompt);
    const rightPrompt = buildImagePrompt(result.right, session.imagePrompt);
    const imageConfig = {
      imageModel: session.imageModel,
      imagePrompt: session.imagePrompt,
      referenceMedia: session.referenceMedia,
    };

    const [leftTask, rightTask] = await Promise.all([
      prisma.imageTask.create({ data: { sessionId: node.sessionId, nodeId: leftId, nodeTitel: result.left.titel, status: "pending" } }),
      prisma.imageTask.create({ data: { sessionId: node.sessionId, nodeId: rightId, nodeTitel: result.right.titel, status: "pending" } }),
    ]);

    after(async () => {
      async function processTask(taskId: string, nodeIdArg: string, prompt: string) {
        await prisma.imageTask.update({ where: { id: taskId }, data: { status: "generating", startedAt: new Date() } });
        try {
          const imgUrl = await generateNodeImage(prompt, nodeIdArg, imageConfig);
          if (imgUrl) {
            await prisma.treeNode.update({ where: { id: nodeIdArg }, data: { mediaUrl: imgUrl } });
            await prisma.imageTask.update({ where: { id: taskId }, data: { status: "completed", imageUrl: imgUrl, completedAt: new Date() } });
          } else {
            await prisma.imageTask.update({ where: { id: taskId }, data: { status: "failed", error: "Generation returned null", completedAt: new Date() } });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.imageTask.update({ where: { id: taskId }, data: { status: "failed", error: msg, completedAt: new Date() } });
        }
      }

      await Promise.all([
        processTask(leftTask.id, leftId, leftPrompt),
        processTask(rightTask.id, rightId, rightPrompt),
      ]);
    });
  }

  return NextResponse.json(result);
}
