import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT for migrations (recommended), fallback to pooled
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
