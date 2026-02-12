import crypto from "crypto";

const PEPPER = process.env.VOTER_PEPPER;

if (!PEPPER) {
  throw new Error("Missing VOTER_PEPPER env var");
}

export function hashVoterId(voterId: string) {
  return crypto.createHash("sha256").update(`${PEPPER}:${voterId}`).digest("hex");
}
