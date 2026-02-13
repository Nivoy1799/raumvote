import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const treeVersion = searchParams.get("treeVersion") ?? "";
  const optionId = searchParams.get("optionId") ?? "";
  const voterId = searchParams.get("voterId") ?? "";

  if (!treeId || !treeVersion || !optionId || !voterId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
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
  const { treeId, treeVersion, optionId, voterId, text } = body;

  if (!treeId || !treeVersion || !optionId || !voterId || !text) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const trimmed = (text as string).trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return NextResponse.json({ error: "Invalid text length" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  const user = await prisma.user.findUnique({
    where: { voterHash },
    select: { username: true, avatarUrl: true },
  });

  const comment = await prisma.comment.create({
    data: { treeId, treeVersion, optionId, voterHash, text: trimmed },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      text: comment.text,
      username: user?.username || null,
      avatarUrl: user?.avatarUrl || null,
      createdAt: comment.createdAt,
      likeCount: 0,
      isLiked: false,
    },
  });
}
