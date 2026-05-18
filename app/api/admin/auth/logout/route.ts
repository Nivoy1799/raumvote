import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_REFRESH_COOKIE_NAME } from "@/lib/jwt";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  res.cookies.delete(ADMIN_REFRESH_COOKIE_NAME);
  return res;
}
