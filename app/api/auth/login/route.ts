import { NextResponse } from "next/server";
import { validateToken } from "@/lib/validateToken";
import { hashVoterId } from "@/lib/voterHash";
import { signJwt, COOKIE_NAME } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const valid = await validateToken(token);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const voterHash = hashVoterId(token);
  const jwt = await signJwt(voterHash);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return res;
}
