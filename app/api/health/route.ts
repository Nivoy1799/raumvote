import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import os from "os";

const hostname = os.hostname();

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const res = NextResponse.json({ ok: true, instance: hostname }, { status: 200 });
    res.headers.set("X-Instance-Id", hostname);
    return res;
  } catch {
    const res = NextResponse.json({ ok: false, error: "DB unreachable", instance: hostname }, { status: 503 });
    res.headers.set("X-Instance-Id", hostname);
    return res;
  }
}
