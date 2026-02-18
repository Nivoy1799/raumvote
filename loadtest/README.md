# Load Test

## Prerequisites

- [hey](https://github.com/rakyll/hey) HTTP load generator
  ```bash
  brew install hey        # macOS
  go install github.com/rakyll/hey@latest  # Go
  ```
- Running system (`docker compose up` or `npm run dev`)
- A valid `AccessToken` UUID from the database

## Running

```bash
TOKEN=<your-access-token-uuid> ./loadtest/run.sh
```

Optional environment variables:
| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost` | Base URL of the running app |
| `TOKEN` | (required) | AccessToken UUID for JWT login |
| `REQUESTS` | `1000` | Total number of requests |
| `CONCURRENCY` | `50` | Number of concurrent workers |

## What It Tests

1. **Logs in** via `POST /api/auth/login` to obtain a JWT cookie
2. **Runs load test** against `GET /api/auth/me` (JWT-protected endpoint)
3. **Saves results** to `loadtest/results.txt`

The `/api/auth/me` endpoint verifies the JWT cookie on every request, making it a good target for testing JWT auth under load.

## Failover Test

With multiple replicas running behind Traefik:

```bash
# Check running replicas
docker compose ps

# Stop one app replica
docker compose stop app --index 1

# Re-run load test — should still work via remaining replica(s)
TOKEN=<token> ./loadtest/run.sh

# Restart stopped replica
docker compose start app
```

## Interpreting Results

Key metrics from `hey` output:

- **Requests/sec** — Throughput
- **Average / P50 / P95 / P99** — Latency distribution
- **Status code distribution** — Should be 100% 200s
- **Error distribution** — Should be empty
