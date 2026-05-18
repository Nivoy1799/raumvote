import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || process.env.VOTER_PEPPER);

if (!secret.length) {
  throw new Error("Missing JWT_SECRET or VOTER_PEPPER env var");
}

const ISSUER = "raumvote";
const COOKIE_NAME = "rv-jwt";

const ADMIN_ISSUER = "raumvote-admin";
export const ADMIN_COOKIE_NAME = "rv-admin-jwt";

/** Default expiry: 30 days */
const DEFAULT_EXP = "30d";

export { COOKIE_NAME };

export async function signJwt(voterHash: string, expiresIn = DEFAULT_EXP): Promise<string> {
  return new SignJWT({ sub: voterHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function signAdminJwt(): Promise<string> {
  return new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ADMIN_ISSUER)
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyAdminJwt(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret, { issuer: ADMIN_ISSUER });
    return true;
  } catch {
    return false;
  }
}
