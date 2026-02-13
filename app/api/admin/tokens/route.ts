import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// List all tokens
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.accessToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

// Create new token(s)
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const count = Math.min(Math.max(Number(body?.count) || 1, 1), 100);
  const label = (body?.label ?? "").toString().trim() || null;

  const created = [];
  for (let i = 0; i < count; i++) {
    const token = crypto.randomUUID();
    const itemLabel = count > 1 && label ? `${label} ${i + 1}` : label;
    const record = await prisma.accessToken.create({
      data: { token, label: itemLabel },
    });
    created.push(record);
  }

  return NextResponse.json({ tokens: created });
}

// Update token (activate/deactivate, change label)
export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id ?? "").toString();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.active === "boolean") data.active = body.active;
  if (typeof body?.label === "string") data.label = body.label.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.accessToken.update({
    where: { id },
    data,
  });

  return NextResponse.json({ token: updated });
}

// Delete token
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id ?? "").toString();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.accessToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
