import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterHash } from "@/lib/getVoter";
import { getActiveSession, isSessionOpen } from "@/lib/votingSession";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? "";
  const optionId = searchParams.get("optionId") ?? "";

  if (!sessionId || !optionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req);
  if (!voterHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const comments = await prisma.comment.findMany({
    where: { sessionId, optionId },
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
  const { sessionId, optionId, text, parentId } = body;

  if (!sessionId || !optionId || !text) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const voterHash = await getVoterHash(req, body);
  if (!voterHash) {
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

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { voterHash },
    select: { username: true, avatarUrl: true },
  });

  const comment = await prisma.comment.create({
    data: {
      sessionId,
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
