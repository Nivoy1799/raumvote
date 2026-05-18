import { NextResponse } from "next/server";
import { signAdminJwt, signAdminRefreshJwt, ADMIN_COOKIE_NAME, ADMIN_REFRESH_COOKIE_NAME } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const secret = (body?.secret ?? "").toString();

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [token, refreshToken] = await Promise.all([signAdminJwt(), signAdminRefreshJwt()]);
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
    secure,
  });
  res.cookies.set(ADMIN_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    secure,
  });
  return res;
}
