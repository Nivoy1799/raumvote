import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

export async function POST(req: Request) {
  const { voterId } = await req.json().catch(() => ({}));

  if (!voterId) {
    return NextResponse.json({ error: "Missing voterId" }, { status: 400 });
  }

  if (!(await validateToken(voterId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voterHash = hashVoterId(voterId);

  try {
    // Delete user profile (username and avatar)
    await prisma.user.delete({
      where: { voterHash },
    }).catch(() => null); // User might not exist

    // Anonymize votes by removing any association
    // Votes remain in DB but are now untrackable
    // (They already only store voterHash, not user info)

    // Anonymize likes by deleting them
    // (Likes are removed entirely to break the chain)
    await prisma.like.deleteMany({
      where: { voterHash },
    });

    // Anonymize comments
    // Delete comment likes first (due to foreign key)
    const userComments = await prisma.comment.findMany({
      where: { voterHash },
      select: { id: true },
    });
    const commentIds = userComments.map((c) => c.id);

    if (commentIds.length > 0) {
      await prisma.commentLike.deleteMany({
        where: { commentId: { in: commentIds } },
      });

      // Replace comment text with anonymous text and voterHash, keep comment for thread integrity
      await prisma.comment.updateMany({
        where: { id: { in: commentIds } },
        data: {
          text: "[Gelöschter Kommentar]",
          voterHash: "ANONYMIZED_" + voterHash.substring(0, 16),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
