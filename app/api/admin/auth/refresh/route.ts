import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  signAdminJwt,
  signAdminRefreshJwt,
  verifyAdminJwt,
  verifyAdminRefreshJwt,
  ADMIN_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
} from "@/lib/jwt";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE_NAME)?.value;
  const accessToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  // Accept a valid refresh token, OR fall back to a valid access token to
  // bootstrap a refresh cookie for sessions that pre-date the refresh flow.
  const refreshOk = refreshToken ? await verifyAdminRefreshJwt(refreshToken) : false;
  const accessOk = !refreshOk && accessToken ? await verifyAdminJwt(accessToken) : false;

  if (!refreshOk && !accessOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [token, newRefreshToken] = await Promise.all([signAdminJwt(), signAdminRefreshJwt()]);
  const res = NextResponse.json({ ok: true, bootstrapped: accessOk });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
    secure,
  });
  res.cookies.set(ADMIN_REFRESH_COOKIE_NAME, newRefreshToken, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    secure,
  });
  return res;
}
