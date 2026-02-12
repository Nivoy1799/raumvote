import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashVoterId } from "@/lib/voterHash";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voterId = searchParams.get("voterId") ?? "";
  if (!voterId) return NextResponse.json({ error: "Missing voterId" }, { status: 400 });

  const voterHash = hashVoterId(voterId);

  const user = await prisma.user.upsert({
    where: { voterHash },
    create: { voterHash },
    update: {},
    select: { username: true },
  });

  return NextResponse.json({ username: user.username ?? "" });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const voterId = (body?.voterId ?? "").toString();
  const usernameRaw = (body?.username ?? "").toString().trim();

  if (!voterId) return NextResponse.json({ error: "Missing voterId" }, { status: 400 });

  const username = usernameRaw ? usernameRaw.slice(0, 24) : "";

  // optional: simple allowlist
  if (username && !/^[a-zA-Z0-9_äöüÄÖÜ\- ]+$/.test(username)) {
    return NextResponse.json({ error: "Invalid characters" }, { status: 400 });
  }

  const voterHash = hashVoterId(voterId);

  await prisma.user.upsert({
    where: { voterHash },
    create: { voterHash, username: username || null },
    update: { username: username || null },
  });

  return NextResponse.json({ ok: true });
}
