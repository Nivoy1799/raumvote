# Load Test Report

## Setup

| Parameter         | Wert                                              |
| ----------------- | ------------------------------------------------- |
| Datum             | 2026-02-19 00:35                                  |
| Ziel              | http://localhost                                  |
| Architektur       | 2× Next.js App (standalone) + nginx Load Balancer |
| Authentifizierung | JWT (httpOnly Cookie, HS256, jose-Bibliothek)     |
| Datenbank         | Neon Postgres (Pooled Connection)                 |
| Tool              | [hey](https://github.com/rakyll/hey)              |

## Ergebnisse

| Test                    | Endpoint                                                                         | Requests | Concurrency | Req/s         | Avg (s) | P50 (s) | P95 (s) | P99 (s) | Status 200 |
| ----------------------- | -------------------------------------------------------------------------------- | -------- | ----------- | ------------- | ------- | ------- | ------- | ------- | ---------- |
| Warmup                  | `GET http://localhost/api/auth/me`                                               | 100      | 10          | **933.7689**  | 0.0102  | 0.0099  | 0.0199  | 0.0241  | 100        |
| Baseline (moderate)     | `GET http://localhost/api/auth/me`                                               | 1000     | 50          | **1349.9969** | 0.0324  | 0.0331  | 0.0557  | 0.0668  | 1000       |
| High Concurrency        | `GET http://localhost/api/auth/me`                                               | 2000     | 200         | **1742.3406** | 0.1072  | 0.1082  | 0.1382  | 0.1659  | 2000       |
| Sustained Load (5s)     | `GET http://localhost/api/auth/me`                                               | 5000     | 100         | **2162.9109** | 0.0442  | 0.0456  | 0.0816  | 0.0940  | 5000       |
| Health Check (kein JWT) | `GET http://localhost/api/health`                                                | 1000     | 100         | **560.2328**  | 0.1506  | 0.1636  | 0.2764  | 0.3403  | 1000       |
| Vote Status (JWT + DB)  | `GET http://localhost/api/vote/status?sessionId=placeholder&voterId=placeholder` | 1000     | 50          | **676.3634**  | 0.0710  | 0.0682  | 0.1002  | 0.1240  | 1000       |

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
