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
  const treeId = formData.get("treeId") as string;
  const file = formData.get("file") as File | null;

  if (!treeId || !file) {
    return NextResponse.json({ error: "Missing treeId or file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const key = `reference-media/${treeId}/${safeName}`;
  const contentType = file.type || "application/octet-stream";

  const url = await uploadToR2(key, buffer, contentType);

  // Append to referenceMedia array
  const config = await prisma.treeConfig.findUnique({ where: { treeId } });
  if (!config) {
    return NextResponse.json({ error: "Tree config not found" }, { status: 404 });
  }

  await prisma.treeConfig.update({
    where: { treeId },
    data: { referenceMedia: [...config.referenceMedia, url] },
  });

  return NextResponse.json({ url });
}

// Remove reference media
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { treeId, url } = body;

  if (!treeId || !url) {
    return NextResponse.json({ error: "Missing treeId or url" }, { status: 400 });
  }

  const config = await prisma.treeConfig.findUnique({ where: { treeId } });
  if (!config) {
    return NextResponse.json({ error: "Tree config not found" }, { status: 404 });
  }

  await prisma.treeConfig.update({
    where: { treeId },
    data: { referenceMedia: config.referenceMedia.filter((u) => u !== url) },
  });

  return NextResponse.json({ ok: true });
}
