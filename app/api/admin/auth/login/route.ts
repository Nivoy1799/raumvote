import { NextResponse } from "next/server";
import { signAdminJwt, ADMIN_COOKIE_NAME } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const secret = (body?.secret ?? "").toString();

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await signAdminJwt();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
