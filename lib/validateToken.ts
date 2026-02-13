import { prisma } from "@/lib/prisma";

export async function validateToken(voterId: string): Promise<boolean> {
  if (!voterId) return false;
  const token = await prisma.accessToken.findUnique({
    where: { token: voterId },
    select: { active: true },
  });
  return !!token?.active;
}
