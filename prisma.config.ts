import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT for migrations (recommended), fallback to pooled
    url: env("DIRECT_URL") ?? env("DATABASE_URL"),
  },
});
