import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const connStr = process.env.DATABASE_URL || "";
const needsSsl = connStr.includes("neon.tech") || connStr.includes("sslmode=require");

const pool = new Pool({
  connectionString: connStr,
  max: parseInt(process.env.DB_POOL_SIZE || "10", 10),
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const adapter = new PrismaPg(pool);

export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
