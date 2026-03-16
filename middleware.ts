import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt, COOKIE_NAME } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  let response: NextResponse;

  if (cookie) {
    const voterHash = await verifyJwt(cookie);
    if (voterHash) {
      const headers = new Headers(request.headers);
      headers.set("x-voter-hash", voterHash);
      response = NextResponse.next({ request: { headers } });
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  const duration = Date.now() - start;
  const path = request.nextUrl.pathname;

  // Skip logging for high-frequency polling endpoints
  if (path !== "/api/health" && path !== "/api/metrics") {
    console.log(
      JSON.stringify({
        method: request.method,
        path,
        status: response.status,
        duration_ms: duration,
        auth: !!cookie,
      }),
    );
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
