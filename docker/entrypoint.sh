#!/bin/sh
set -e

echo "[entrypoint] Syncing database schema..."
npx prisma db push 2>&1 || echo "[entrypoint] Warning: db push failed (may already be in sync)"

echo "[entrypoint] Starting Next.js server..."
exec node server.js
