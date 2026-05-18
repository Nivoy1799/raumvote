import { cookies } from "next/headers";
import { verifyAdminJwt, ADMIN_COOKIE_NAME } from "./jwt";

export async function isAdminAuthorized(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminJwt(token);
}
