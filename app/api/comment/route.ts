import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const optionId = searchParams.get("optionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  const comments = await prisma.comment.findMany({
    where: { treeId, treeVersion, optionId },
    orderBy: { createdAt: "asc" },
    include: { likes: { select: { voterHash: true } } },
  });

  const voterHashes = [...new Set(comments.map((c) => c.voterHash))];
  const users = await prisma.user.findMany({
    where: { voterHash: { in: voterHashes } },
    select: { voterHash: true, username: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.voterHash, u]));

  const formatted = comments.map((c) => ({
    id: c.id,
    text: c.text,
    parentId: c.parentId,
    username: userMap.get(c.voterHash)?.username || null,
    avatarUrl: userMap.get(c.voterHash)?.avatarUrl || null,
    createdAt: c.createdAt,
    likeCount: c.likes.length,
    isLiked: c.likes.some((l) => l.voterHash === voterHash),
  }));

  return NextResponse.json({ comments: formatted });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { treeId, treeVersion, optionId, voterId, text, parentId } = body;

  if (!treeId || !treeVersion || !optionId || !voterId || !text) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getActiveSession();
  if (!session || !isSessionOpen(session)) {
    return NextResponse.json({ error: "Voting period closed" }, { status: 403 });
  }

  const trimmed = (text as string).trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return NextResponse.json({ error: "Invalid text length" }, { status: 400 });
  }

  // Validate parentId if provided
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const voterHash = hashVoterId(voterId);

  const user = await prisma.user.findUnique({
    where: { voterHash },
    select: { username: true, avatarUrl: true },
  });

  const comment = await prisma.comment.create({
    data: {
      treeId,
      treeVersion,
      optionId,
      voterHash,
      text: trimmed,
      parentId: parentId || null,
    },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      text: comment.text,
      parentId: comment.parentId,
      username: user?.username || null,
      avatarUrl: user?.avatarUrl || null,
      createdAt: comment.createdAt,
      likeCount: 0,
      isLiked: false,
    },
  });
}
