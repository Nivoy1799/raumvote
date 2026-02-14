import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// List all sessions
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.votingSession.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sessions });
}

// Create new session
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const treeId = (body?.treeId ?? "").toString().trim();
  const treeVersion = (body?.treeVersion ?? "").toString().trim();
  const title = (body?.title ?? "").toString().trim() || null;
  const durationDays = Math.min(Math.max(Number(body?.durationDays) || 30, 1), 365);

  if (!treeId || !treeVersion) {
    return NextResponse.json({ error: "Missing treeId/treeVersion" }, { status: 400 });
  }

  // Only one draft or active session at a time
  const existing = await prisma.votingSession.findFirst({
    where: { status: { in: ["draft", "active"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Es gibt bereits eine ${existing.status === "draft" ? "Entwurf" : "aktive"}-Periode` },
      { status: 409 },
    );
  }

  const session = await prisma.votingSession.create({
    data: { treeId, treeVersion, title, durationDays },
  });

  return NextResponse.json({ session });
}

// Update session (state transitions + field edits)
export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id ?? "").toString();
  const action = (body?.action ?? "").toString();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const session = await prisma.votingSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // State transitions
  if (action) {
    const transitions: Record<string, { from: string[]; to: string; extra: Record<string, unknown> }> = {
      start:  { from: ["draft"],  to: "active",    extra: { startedAt: new Date() } },
      finish: { from: ["active"], to: "finished",  extra: { endedAt: new Date() } },
      cancel: { from: ["active"], to: "cancelled", extra: { endedAt: new Date() } },
    };

    const t = transitions[action];
    if (!t) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
    if (!t.from.includes(session.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} a session with status "${session.status}"` },
        { status: 409 },
      );
    }

    const updated = await prisma.votingSession.update({
      where: { id },
      data: { status: t.to, ...t.extra },
    });

    return NextResponse.json({ session: updated });
  }

  // Field edits (only draft)
  if (session.status !== "draft") {
    return NextResponse.json({ error: "Can only edit draft sessions" }, { status: 409 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string") data.title = body.title.trim() || null;
  if (typeof body?.durationDays === "number") data.durationDays = Math.min(Math.max(body.durationDays, 1), 365);
  if (typeof body?.treeId === "string") data.treeId = body.treeId.trim();
  if (typeof body?.treeVersion === "string") data.treeVersion = body.treeVersion.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.votingSession.update({ where: { id }, data });
  return NextResponse.json({ session: updated });
}

// Delete session (only draft)
export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id ?? "").toString();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const session = await prisma.votingSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "draft") {
    return NextResponse.json({ error: "Can only delete draft sessions" }, { status: 409 });
  }

  await prisma.votingSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
