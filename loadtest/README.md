# Load Test

## Voraussetzungen

- [hey](https://github.com/rakyll/hey) HTTP Load Generator
  ```bash
  brew install hey        # macOS
  go install github.com/rakyll/hey@latest  # Go
  ```
- Laufendes System (`docker compose up` oder `npm run dev`)
- Ein gültiger `AccessToken` UUID aus der Datenbank

## Ausführung

```bash
TOKEN=<access-token-uuid> ./loadtest/run.sh
```

| Variable   | Default            | Beschreibung                   |
| ---------- | ------------------ | ------------------------------ |
| `TOKEN`    | (erforderlich)     | AccessToken UUID für JWT Login |
| `BASE_URL` | `http://localhost` | Basis-URL der laufenden App    |

## Was wird getestet?

Das Skript führt **6 Test-Szenarien** gegen JWT-geschützte Endpoints aus:

| #   | Test             | Endpoint           | Requests | Concurrency | Zweck                           |
| --- | ---------------- | ------------------ | -------- | ----------- | ------------------------------- |
| 1   | Warmup           | `/api/auth/me`     | 100      | 10          | JIT + Connection Pool aufwärmen |
| 2   | Baseline         | `/api/auth/me`     | 1000     | 50          | Normaler Durchsatz              |
| 3   | High Concurrency | `/api/auth/me`     | 2000     | 200         | Verhalten unter Spitzenlast     |
| 4   | Sustained Load   | `/api/auth/me`     | 5000     | 100         | Stabilität über längere Zeit    |
| 5   | Health Check     | `/api/health`      | 1000     | 100         | DB-Overhead isolieren           |
| 6   | Vote Status      | `/api/vote/status` | 1000     | 50          | JWT + DB Query kombiniert       |

## Ausgabe

- Echtzeit-Output im Terminal
- Detaillierter Report in `loadtest/report.md` mit:
  - Ergebnis-Tabelle aller Tests
  - Bottleneck-Analyse
  - Skalierungsstrategie
  - Failover-Anleitung

## Architektur unter Last

```
Client (hey)
  │
  ├── 50-200 gleichzeitige Verbindungen
  │
  ▼
nginx (Round-Robin Load Balancer)
  │
  ├── → App-1 (Node.js, DB Pool: 10)
  │                │
  └── → App-2 (Node.js, DB Pool: 10)
                   │
                   ▼
           Neon Postgres (Remote)
```

## Failover-Test

```bash
# Replikas prüfen
docker compose ps

# Eine App-Instanz stoppen
docker stop raumvote-app-1

# Load Test erneut ausführen — System muss weiter funktionieren
TOKEN=<token> ./loadtest/run.sh

# Instanz wieder starten
docker start raumvote-app-1
```
