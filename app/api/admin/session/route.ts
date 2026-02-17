import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(req: Request): boolean {
  if (!ADMIN_SECRET) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${ADMIN_SECRET}`;
}

// List all sessions (with tree stats)
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.votingSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { nodes: true, votes: true, likes: true, comments: true } } },
  });

  return NextResponse.json({ sessions });
}

// Create new session (with root node)
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const treeId = (body?.treeId ?? "").toString().trim();
  const title = (body?.title ?? "").toString().trim() || null;
  const durationDays = Math.min(Math.max(Number(body?.durationDays) || 30, 1), 365);
  const systemPrompt = (body?.systemPrompt ?? "").toString();
  const modelName = (body?.modelName ?? "gpt-4o").toString().trim();
  const rootTitel = (body?.rootTitel ?? "").toString().trim();
  const rootBeschreibung = (body?.rootBeschreibung ?? "").toString().trim();
  const rootContext = (body?.rootContext ?? "").toString();

  if (!treeId || !rootTitel || !rootBeschreibung) {
    return NextResponse.json({ error: "Missing treeId, rootTitel, or rootBeschreibung" }, { status: 400 });
  }

  // Only one draft or active session at a time
  const existing = await prisma.votingSession.findFirst({
    where: { status: { in: ["draft", "active"] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Es gibt bereits eine ${existing.status === "draft" ? "Entwurf" : "aktive"}-Session` },
      { status: 409 },
    );
  }

  // Create session + root node in transaction
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.votingSession.create({
      data: {
        treeId,
        title,
        durationDays,
        systemPrompt,
        modelName,
      },
    });

    const rootNode = await tx.treeNode.create({
      data: {
        sessionId: session.id,
        titel: rootTitel,
        beschreibung: rootBeschreibung,
        context: rootContext,
        side: null,
        depth: 0,
        discoveredAt: new Date(),
      },
    });

    const updated = await tx.votingSession.update({
      where: { id: session.id },
      data: { rootNodeId: rootNode.id },
    });

    return { session: updated, rootNode };
  });

  return NextResponse.json(result);
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
      start:   { from: ["draft"],  to: "active",   extra: { startedAt: new Date() } },
      archive: { from: ["active"], to: "archived", extra: { endedAt: new Date() } },
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

  // Field edits (only draft or active sessions for config changes)
  const data: Record<string, unknown> = {};

  // These fields can be edited on draft sessions only
  if (session.status === "draft") {
    if (typeof body?.title === "string") data.title = body.title.trim() || null;
    if (typeof body?.durationDays === "number") data.durationDays = Math.min(Math.max(body.durationDays, 1), 365);
    if (typeof body?.treeId === "string") data.treeId = body.treeId.trim();
  }

  // Tree config fields can be edited on draft or active sessions
  if (session.status === "draft" || session.status === "active") {
    if (typeof body?.systemPrompt === "string") data.systemPrompt = body.systemPrompt;
    if (typeof body?.modelName === "string") data.modelName = body.modelName.trim();
    if (body?.discoveryEnabled !== undefined) data.discoveryEnabled = !!body.discoveryEnabled;
    if (typeof body?.imageModel === "string") data.imageModel = body.imageModel;
    if (body?.imagePrompt !== undefined) data.imagePrompt = body.imagePrompt || null;
  }

  if (session.status === "archived") {
    return NextResponse.json({ error: "Cannot edit archived sessions" }, { status: 409 });
  }

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
