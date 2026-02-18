#!/bin/bash
set -e

# ── Configuration ──
BASE_URL="${BASE_URL:-http://localhost}"
TOKEN="${TOKEN:-}"  # Pass an existing AccessToken UUID
REQUESTS="${REQUESTS:-1000}"
CONCURRENCY="${CONCURRENCY:-50}"

if [ -z "$TOKEN" ]; then
  echo "Usage: TOKEN=<access-token-uuid> ./loadtest/run.sh"
  echo ""
  echo "  TOKEN         A valid AccessToken UUID from the database"
  echo "  BASE_URL      Base URL (default: http://localhost)"
  echo "  REQUESTS      Total requests (default: 1000)"
  echo "  CONCURRENCY   Concurrent workers (default: 50)"
  exit 1
fi

# Check if hey is installed
if ! command -v hey &> /dev/null; then
  echo "Error: 'hey' is not installed."
  echo "Install with: brew install hey  (macOS) or go install github.com/rakyll/hey@latest"
  exit 1
fi

# ── Step 1: Login to get JWT cookie ──
echo "==> Logging in with token to get JWT..."
COOKIE_FILE=$(mktemp)
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\"}")

if echo "$LOGIN_RESP" | grep -q '"ok":true'; then
  echo "    Login successful"
else
  echo "    Login failed: $LOGIN_RESP"
  rm -f "$COOKIE_FILE"
  exit 1
fi

# Extract JWT cookie value
JWT=$(grep "rv-jwt" "$COOKIE_FILE" | awk '{print $NF}')
rm -f "$COOKIE_FILE"

if [ -z "$JWT" ]; then
  echo "    Error: Could not extract JWT cookie"
  exit 1
fi

echo "    JWT obtained (${#JWT} chars)"

# ── Step 2: Run load test against JWT-protected endpoint ──
ENDPOINT="${BASE_URL}/api/auth/me"

echo ""
echo "==> Load test: ${REQUESTS} requests, ${CONCURRENCY} concurrent"
echo "    Endpoint: ${ENDPOINT}"
echo ""

RESULTS_FILE="loadtest/results.txt"

hey -n "$REQUESTS" -c "$CONCURRENCY" \
  -H "Cookie: rv-jwt=${JWT}" \
  "$ENDPOINT" | tee "$RESULTS_FILE"

echo ""
echo "==> Results saved to ${RESULTS_FILE}"

# ── Step 3: Failover test ──
echo ""
echo "==> Failover test instructions:"
echo "    1. Stop one app replica:  docker compose stop app --index 1"
echo "    2. Re-run this script to verify the system still serves requests"
echo "    3. Restart:               docker compose start app"
