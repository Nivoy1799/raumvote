#!/bin/sh
set -e

echo "[worker] Waiting for app to sync database schema..."
sleep 5

echo "[worker] Starting worker..."
exec npx tsx worker.ts
