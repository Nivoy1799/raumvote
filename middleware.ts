import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt, COOKIE_NAME } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (cookie) {
    const voterHash = await verifyJwt(cookie);
    if (voterHash) {
      const headers = new Headers(request.headers);
      headers.set("x-voter-hash", voterHash);
      return NextResponse.next({ request: { headers } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
