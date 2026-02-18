import { NextResponse } from "next/server";

/**
 * Lightweight JWT check. If middleware set x-voter-hash, the cookie is valid.
 * Falls back to legacy token validation for clients without JWT.
 */
export async function GET(req: Request) {
  const voterHash = req.headers.get("x-voter-hash");

  if (voterHash) {
    return NextResponse.json({ valid: true });
  }

  // Legacy fallback: validate raw token from query param
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  if (token) {
    const { validateToken } = await import("@/lib/validateToken");
    const valid = await validateToken(token);
    return NextResponse.json({ valid });
  }

  return NextResponse.json({ valid: false });
}
