import { hashVoterId } from "@/lib/voterHash";
import { validateToken } from "@/lib/validateToken";

/**
 * Extract voterHash from the request.
 *
 * 1. Check x-voter-hash header (set by middleware from JWT cookie)
 * 2. Fall back to voterId in body/query → validate token → hash
 *
 * Returns voterHash string or null if unauthorized.
 */
export async function getVoterHash(req: Request, body?: Record<string, unknown>): Promise<string | null> {
  // JWT path: middleware already verified and set this header
  const fromJwt = req.headers.get("x-voter-hash");
  if (fromJwt) return fromJwt;

  // Legacy path: voterId from body or query params
  let voterId: string | undefined;

  if (body && typeof body.voterId === "string") {
    voterId = body.voterId;
  } else {
    const url = new URL(req.url);
    voterId = url.searchParams.get("voterId") ?? undefined;
  }

  if (!voterId) return null;
  if (!(await validateToken(voterId))) return null;
  return hashVoterId(voterId);
}
