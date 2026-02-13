import { NextResponse } from "next/server";
import { validateToken } from "@/lib/validateToken";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const valid = await validateToken(token);
  return NextResponse.json({ valid });
}
