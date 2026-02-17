import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// Upload reference media file
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const sessionId = formData.get("sessionId") as string;
  const file = formData.get("file") as File | null;

  if (!sessionId || !file) {
    return NextResponse.json({ error: "Missing sessionId or file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const key = `reference-media/${sessionId}/${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const url = await uploadToR2(key, buffer, contentType);

  const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.votingSession.update({
    where: { id: sessionId },
    data: { referenceMedia: [...session.referenceMedia, url] },
  });

  return NextResponse.json({ url });
}

// Remove reference media
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, url } = body;

  if (!sessionId || !url) {
    return NextResponse.json({ error: "Missing sessionId or url" }, { status: 400 });
  }

  const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.votingSession.update({
    where: { id: sessionId },
    data: { referenceMedia: session.referenceMedia.filter((u) => u !== url) },
  });

  return NextResponse.json({ ok: true });
}
