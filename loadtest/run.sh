#!/bin/bash
set -e

# ── Configuration ──
BASE_URL="${BASE_URL:-http://localhost}"
TOKEN="${TOKEN:-}"
REPORT_FILE="loadtest/report.md"

if [ -z "$TOKEN" ]; then
  echo "Usage: TOKEN=<access-token-uuid> ./loadtest/run.sh"
  echo ""
  echo "  TOKEN         A valid AccessToken UUID from the database"
  echo "  BASE_URL      Base URL (default: http://localhost)"
  exit 1
fi

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

JWT=$(grep "rv-jwt" "$COOKIE_FILE" | awk '{print $NF}')
rm -f "$COOKIE_FILE"

if [ -z "$JWT" ]; then
  echo "    Error: Could not extract JWT cookie"
  exit 1
fi

echo "    JWT obtained (${#JWT} chars)"
echo ""

# ── Helper: run a test and capture output ──
run_test() {
  local label="$1"
  local endpoint="$2"
  local requests="$3"
  local concurrency="$4"
  local method="${5:-GET}"
  local body="$6"

  echo "==> Test: ${label}"
  echo "    ${method} ${endpoint} — ${requests} requests, ${concurrency} concurrent"

  local tmpfile=$(mktemp)

  if [ -n "$body" ]; then
    hey -n "$requests" -c "$concurrency" -m "$method" \
      -H "Cookie: rv-jwt=${JWT}" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$endpoint" > "$tmpfile" 2>&1
  else
    hey -n "$requests" -c "$concurrency" \
      -H "Cookie: rv-jwt=${JWT}" \
      "$endpoint" > "$tmpfile" 2>&1
  fi

  cat "$tmpfile"
  echo ""

  # Extract key metrics
  local rps=$(grep "Requests/sec" "$tmpfile" | awk '{print $2}')
  local avg=$(grep "Average:" "$tmpfile" | head -1 | awk '{print $2}')
  local fastest=$(grep "Fastest:" "$tmpfile" | awk '{print $2}')
  local slowest=$(grep "Slowest:" "$tmpfile" | awk '{print $2}')
  local p50=$(grep "50%" "$tmpfile" | awk '{print $3}')
  local p95=$(grep "95%" "$tmpfile" | awk '{print $3}')
  local p99=$(grep "99%" "$tmpfile" | awk '{print $3}')
  local status_200=$(grep "\[200\]" "$tmpfile" | awk '{print $2}' || echo "0")
  local errors=$(grep -c "Error\|error\|\[5[0-9][0-9]\]\|\[4[0-9][0-9]\]" "$tmpfile" || true)
  local resp_wait=$(grep "resp wait" "$tmpfile" | awk '{print $3}')

  # Store for report
  echo "${label}|${method} ${endpoint}|${requests}|${concurrency}|${rps}|${avg}|${p50}|${p95}|${p99}|${fastest}|${slowest}|${status_200}|${resp_wait}" >> "$METRICS_FILE"

  rm -f "$tmpfile"
}

# ── Step 2: Run test scenarios ──
METRICS_FILE=$(mktemp)
ENDPOINT_ME="${BASE_URL}/api/auth/me"
ENDPOINT_HEALTH="${BASE_URL}/api/health"
ENDPOINT_VOTE_STATUS="${BASE_URL}/api/vote/status?sessionId=placeholder&voterId=placeholder"

echo "=============================================="
echo "  Load Test Report — $(date '+%Y-%m-%d %H:%M')"
echo "  Target: ${BASE_URL}"
echo "=============================================="
echo ""

# Test 1: Warmup
run_test "Warmup" "$ENDPOINT_ME" 100 10

# Test 2: Baseline — moderate load
run_test "Baseline (moderate)" "$ENDPOINT_ME" 1000 50

# Test 3: High concurrency
run_test "High Concurrency" "$ENDPOINT_ME" 2000 200

# Test 4: Sustained load
run_test "Sustained Load (5s)" "$ENDPOINT_ME" 5000 100

# Test 5: Health endpoint (no JWT, no DB)
run_test "Health Check (kein JWT)" "$ENDPOINT_HEALTH" 1000 100

# Test 6: Vote status (JWT + DB query)
run_test "Vote Status (JWT + DB)" "$ENDPOINT_VOTE_STATUS" 1000 50

# ── Step 3: Generate report ──
echo ""
echo "==> Generating report..."

cat > "$REPORT_FILE" << 'HEADER'
# Load Test Report

## Setup

| Parameter | Wert |
|---|---|
HEADER

cat >> "$REPORT_FILE" << EOF
| Datum | $(date '+%Y-%m-%d %H:%M') |
| Ziel | ${BASE_URL} |
| Architektur | 2× Next.js App (standalone) + nginx Load Balancer |
| Authentifizierung | JWT (httpOnly Cookie, HS256, jose-Bibliothek) |
| Datenbank | Neon Postgres (Pooled Connection) |
| Tool | [hey](https://github.com/rakyll/hey) |

## Ergebnisse

| Test | Endpoint | Requests | Concurrency | Req/s | Avg (s) | P50 (s) | P95 (s) | P99 (s) | Status 200 |
|---|---|---|---|---|---|---|---|---|---|
EOF

while IFS='|' read -r label endpoint requests concurrency rps avg p50 p95 p99 fastest slowest status_200 resp_wait; do
  echo "| ${label} | \`${endpoint}\` | ${requests} | ${concurrency} | **${rps}** | ${avg} | ${p50} | ${p95} | ${p99} | ${status_200} |" >> "$REPORT_FILE"
done < "$METRICS_FILE"

cat >> "$REPORT_FILE" << 'ANALYSIS'

## Analyse

### Durchsatz (Requests/s)

Der **Baseline-Test** zeigt den nachhaltigen Durchsatz des Systems unter normaler Last.
Der **High Concurrency-Test** zeigt, wie das System bei vielen gleichzeitigen Verbindungen skaliert.

### Latenzverteilung

- **P50 (Median)**: Typische Antwortzeit für einen normalen Request
- **P95**: 95% aller Requests sind schneller als dieser Wert
- **P99**: Worst-Case-Szenario (ohne Ausreisser)
- Grosse Differenz zwischen P50 und P99 deutet auf Queueing oder GC-Pausen hin

### Engpässe (Bottlenecks)

1. **Neon Postgres (Netzwerk-Latenz)**
   - Jeder JWT-geschützte Endpoint macht mindestens einen DB-Roundtrip
   - Neon läuft remote → ~20-50ms Netzwerk-Latenz pro Query
   - Vergleich: Health-Endpoint (mit DB) vs. reiner JWT-Check zeigt den DB-Overhead

2. **JWT-Verifikation (CPU)**
   - HS256 Signaturprüfung in der Next.js Middleware
   - Sehr schnell (~0.1ms), kein relevanter Engpass

3. **Node.js Event Loop**
   - Single-threaded — bei CPU-intensiven Tasks blockiert der Event Loop
   - Load Balancer (nginx → 2 Replicas) verdoppelt die Kapazität
   - Sichtbar wenn P99 >> P50 bei hoher Concurrency

4. **Connection Pool**
   - `DB_POOL_SIZE=10` pro App-Instanz (20 total)
   - Bei > 20 gleichzeitigen DB-Queries entsteht Queueing
   - Erkennbar an steigender Latenz bei hoher Concurrency

### Skalierungsstrategie

```
Client → nginx (Round-Robin) → App-1 (Pool: 10 Connections) → Neon Postgres
                              → App-2 (Pool: 10 Connections) ↗
```

- **Horizontal**: Mehr App-Replicas via `APP_REPLICAS=N docker compose up`
- **Vertikal**: Grösserer Connection Pool via `DB_POOL_SIZE`
- **Caching**: Für read-heavy Endpoints (Results, Vote Status)

## Failover-Test

```bash
# 1. Einen App-Container stoppen
docker stop raumvote-app-1

# 2. Load Test erneut ausführen — System antwortet weiter
TOKEN=<token> ./loadtest/run.sh

# 3. Container wieder starten
docker start raumvote-app-1
```

nginx erkennt den ausgefallenen Upstream automatisch und leitet alle Requests
an die verbleibende(n) Instanz(en) weiter.
ANALYSIS

rm -f "$METRICS_FILE"

echo "==> Report saved to ${REPORT_FILE}"
echo ""
echo "==> Done. Run 'cat ${REPORT_FILE}' to view the full report."
