# Load Test Report

## Setup

| Parameter         | Wert                                              |
| ----------------- | ------------------------------------------------- |
| Datum             | 2026-05-18 13:38                                  |
| Ziel              | http://localhost                                  |
| Architektur       | 2× Next.js App (standalone) + nginx Load Balancer |
| Authentifizierung | JWT (httpOnly Cookie, HS256, jose-Bibliothek)     |
| Datenbank         | PostgreSQL 18.4 (lokaler Docker-Container)        |
| Tool              | [hey](https://github.com/rakyll/hey)              |

## Ergebnisse

| Test                    | Endpoint                                                                   | Requests | Concurrency | Req/s         | Avg (s) | P50 (s) | P95 (s) | P99 (s) | Status 200 |
| ----------------------- | -------------------------------------------------------------------------- | -------- | ----------- | ------------- | ------- | ------- | ------- | ------- | ---------- |
| Warmup                  | `GET http://localhost/api/auth/me`                                         | 100      | 10          | **1015.2108** | 0.0088  | 0.0097  | 0.0240  | 0.0349  | 100        |
| Baseline (moderate)     | `GET http://localhost/api/auth/me`                                         | 1000     | 50          | **1813.0146** | 0.0239  | 0.0160  | 0.0565  | 0.0582  | 1000       |
| High Concurrency        | `GET http://localhost/api/auth/me`                                         | 2000     | 200         | **2682.0481** | 0.0643  | 0.0560  | 0.1314  | 0.1374  | [200]      |
| 2000                    | `0.0622`                                                                   |          |             | \*\*\*\*      |         |         |         |         |            |
| Sustained Load (5s)     | `GET http://localhost/api/auth/me`                                         | 5000     | 100         | **3131.5056** | 0.0299  | 0.0290  | 0.0659  | 0.0742  | 5000       |
| Health Check (kein JWT) | `GET http://localhost/api/health`                                          | 1000     | 100         | **2416.2101** | 0.0366  | 0.0413  | 0.0619  | 0.0633  | 1000       |
| Vote Status (JWT + DB)  | `GET http://localhost/api/vote/status?sessionId=cmlrrrund000138bwljssqdm6` | 1000     | 50          | **2349.7515** | 0.0203  | 0.0200  | 0.0299  | 0.0358  | 1000       |

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
