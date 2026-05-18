// RaumVote – Distributed Systems Präsentation FS26
// Jovin Risch

// ─────────────────────────────────────────────────────────────────────────────
// THEME — dark minimal (ChatGPT-inspired)
// ─────────────────────────────────────────────────────────────────────────────

#let c-bg      = rgb("#212121")
#let c-surface = rgb("#2f2f2f")
#let c-bar     = rgb("#171717")
#let c-border  = rgb("#444444")
#let c-text    = rgb("#ececec")
#let c-muted   = rgb("#8e8ea0")
#let c-section = rgb("#0d0d0d")

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL TEXT
// ─────────────────────────────────────────────────────────────────────────────

#set text(
  font: ("Helvetica Neue", "Helvetica", "Arial"),
  size: 11pt,
  fill: c-text,
  lang: "de",
)
#set par(leading: 0.75em, spacing: 0.85em)
#set list(
  marker: text(fill: c-muted)[›],
  indent: 2mm,
  body-indent: 3mm,
)

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

#let slide(title: none, reqs: none, body) = {
  page(
    width: 254mm,
    height: 143mm,
    fill: c-bg,
    margin: (top: 15mm, bottom: 12mm, left: 12mm, right: 12mm),
    header: none,
    footer: none,
    background: [
      #place(top + left, rect(width: 100%, height: 10mm, fill: c-bar))
      #place(bottom + left,
        rect(width: 100%, height: 9mm, fill: c-bar, inset: (x: 12mm, y: 2mm))[
          #align(horizon)[
            #text(size: 8pt, fill: c-muted)[RaumVote Infrastructure Dashboard · Distributed Systems FS26]
          ]
        ]
      )
    ],
  )[
    #if title != none {
      grid(
        columns: (1fr, auto),
        align: (left + bottom, right + bottom),
        text(size: 15pt, weight: "bold", fill: c-text)[#title],
        if reqs != none { reqs },
      )
      v(1.5mm)
      line(length: 100%, stroke: 0.4pt + c-border)
      v(4mm)
    }
    #body
  ]
}

#let title-slide(title, subtitle, event, author) = {
  page(
    width: 254mm,
    height: 143mm,
    fill: c-bg,
    margin: (top: 12mm, bottom: 11mm, left: 14mm, right: 14mm),
    header: none,
    footer: none,
    background: [
      #place(top + left, rect(width: 100%, height: 10mm, fill: c-bar))
      #place(bottom + left, rect(width: 100%, height: 9mm, fill: c-bar))
    ],
  )[
    #align(horizon)[
      #image("../../public/raumvote_white.png", height: 20mm)
      #v(3mm)
      #text(size: 20pt, weight: "bold", fill: c-text)[#title]
      #v(2mm)
      #text(size: 13pt, fill: c-muted)[#subtitle]
      #v(7mm)
      #line(length: 40%, stroke: 1pt + c-border)
      #v(5mm)
      #text(size: 10pt, fill: c-muted)[#event]
      #v(2mm)
      #text(size: 10pt, fill: c-text)[#author]
    ]
  ]
}

#let section-slide(title, subtitle: none) = {
  page(
    width: 254mm,
    height: 143mm,
    fill: c-section,
    margin: 0mm,
    header: none,
    footer: none,
  )[
    #align(center + horizon)[
      #text(size: 26pt, weight: "bold", fill: c-text)[#title]
      #if subtitle != none {
        v(4mm)
        text(size: 13pt, fill: c-muted)[#subtitle]
      }
    ]
  ]
}

#let tag(label) = box(
  fill: c-surface,
  stroke: 0.5pt + c-border,
  radius: 2pt,
  inset: (x: 6pt, y: 2pt),
  text(size: 9pt, fill: c-text, weight: "bold")[#label]
)

#let pipeline-node(label) = block(
  fill: c-surface,
  stroke: 0.5pt + c-border,
  radius: 2pt,
  inset: (x: 8pt, y: 4pt),
  width: 100%,
)[
  #align(center)[#text(size: 9.5pt, weight: "bold", fill: c-text)[#label]]
]

#let svc(name, sub: none) = rect(
  fill: c-surface,
  stroke: 0.5pt + c-border,
  radius: 2pt,
  inset: (x: 6pt, y: 3pt),
  width: 100%,
)[
  #align(center)[
    #text(size: 8.5pt, weight: "bold")[#name]
    #if sub != none [
      #linebreak()
      #text(size: 7pt, fill: c-muted)[#sub]
    ]
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — TITEL
// ─────────────────────────────────────────────────────────────────────────────

#title-slide(
  "RaumVote Infrastructure Dashboard",
  "Visibility in the Age of Containers and AI",
  "Distributed Systems · FS26 · OST",
  "Jovin Risch",
)

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — WAS IST RAUMVOTE?
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Was ist RaumVote?")[
  #grid(
    columns: (1fr, 1.05fr),
    gutter: 8mm,
    [
      Mobile-first App für *Jugendpartizipation* im öffentlichen Raum. Nutzer navigieren per Swipe durch binäre Entscheidungsbäume und stimmen für eine Raum-Option ab.

      #v(3mm)
      *Technologien*
      - Next.js 16 (App Router), React 19
      - PostgreSQL via Prisma ORM
      - AI-Bildgenerierung (Worker-Prozess)
      - Token-basierte Zugangskontrolle via QR-Code

      #v(3mm)
      *Cloud-Deployment*
      #grid(
        columns: (1fr, 1fr),
        gutter: 2mm,
        [#text(size: 8pt)[- *Vercel* — Next.js App \ - *Railway* — Worker (lange KI-Antworten) \ - *Neon* — PostgreSQL]],
        [#text(size: 8pt)[- *OpenAI* — GPT-4o Baumgenerierung \ - *Gemini* — Bildgenerierung \ - *Cloudflare R2* — Bildspeicher]],
      )
    ],
    [
      #image("../../private/c4_model_system_v2.png", width: 100%)
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — DSYS REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "DSys Requirements")[
  #grid(
    columns: (1fr, 1fr),
    gutter: 5mm,
    [
      #tag("R1") *Load Balancing + Failover* \
      nginx Round-Robin, APP_REPLICAS konfigurierbar

      #v(3.5mm)
      #tag("R2") *Containerisierung* \
      Multi-Stage Dockerfile · 4 Container: DB, 2× App, Worker

      #v(3.5mm)
      #tag("R3") *Simple Frontend* \
      Infrastructure Dashboard (Grafana, in App eingebettet)

      #v(3.5mm)
      #tag("R4") *JWT-Authentifizierung (OWASP)* \
      jose, HS256, httpOnly Cookie
    ],
    [
      #tag("R5") *Persistente Datenhaltung* \
      PostgreSQL, Docker Volumes (Monitoring)

      #v(3.5mm)
      #tag("R6") *Single-Command Setup* \
      `docker compose up` inkl. DB-Migration

      #v(3.5mm)
      #tag("R7") *Load Test* \
      hey, 6 Szenarien gegen JWT-geschützte Endpoints

      #v(4mm)
      #rect(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 7pt, y: 5pt), width: 100%)[
        #text(size: 8pt, fill: c-muted)[
          *Warum der Monitoring-Stack?* \
          Das bestehende RaumVote-Frontend (Voting-UI) wurde bereits im Rahmen von IKTS entwickelt und konnte daher nicht als DSys-Frontend angerechnet werden. Das *Infrastructure Dashboard* wurde gezielt für DSys gebaut und erforderte den vollständigen Monitoring-Stack.
        ]
      ]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — PROD VS DEV
// ─────────────────────────────────────────────────────────────────────────────

#let cell-prod(body) = rect(fill: rgb("#1e3a5f"), stroke: 0.5pt + rgb("#4a8acf"), radius: 2pt, inset: (x: 8pt, y: 5pt), width: 100%)[
  #align(center)[#text(size: 9pt, fill: c-text)[#body]]
]
#let cell-dev(body) = rect(fill: rgb("#1a3a2a"), stroke: 0.5pt + rgb("#4aaf6a"), radius: 2pt, inset: (x: 8pt, y: 5pt), width: 100%)[
  #align(center)[#text(size: 9pt, fill: c-text)[#body]]
]
#let cell-label(body) = rect(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 5pt), width: 100%)[
  #align(center)[#text(size: 9pt, weight: "bold", fill: c-muted)[#body]]
]

#slide(title: "Prod vs. Dev (Docker)")[
  #grid(
    columns: (1fr, 2fr, 2fr),
    gutter: 3mm,
    cell-label(""),        cell-label("PROD (IKTS)"),             cell-label("DEV (DSys)"),
    cell-label("Env"),     cell-prod("Cloud Services"),           cell-dev("Docker Compose"),
    cell-label("App"),     cell-prod("Vercel (Serverless)"),      cell-dev("2 × Next.js (alpine)"),
    cell-label("Worker"),  cell-prod("Railway"),                  cell-dev("1 × Node.js (alpine)"),
    cell-label("DB"),      cell-prod("Neon (Cloud PostgreSQL)"),  cell-dev("1 × PostgreSQL 18.4"),
    cell-label("NLP API"), cell-prod("OpenAI GPT-4o"),           cell-dev("OpenAI GPT-4o *"),
    cell-label("T2I API"), cell-prod("Google Gemini"),            cell-dev("Google Gemini *"),
    cell-label("Monitoring"), cell-prod("—"),                    cell-dev("Grafana · InfluxDB · Loki"),
  )
  #v(4mm)
  #text(size: 8pt, fill: c-muted)[(\*) Getestet, jedoch nicht produktiv eingesetzt: Lokale Alternativen scheiterten an der Komplexität (Referenzbild + Text kombiniert bei mind. 80 % Gemini-Qualität nicht erreichbar).]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — SYSTEMARCHITEKTUR
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Systemarchitektur", reqs: [#tag("R2")])[
  #image("../../private/c4_model_container_v2.png", width: 100%, height: 95mm, fit: "contain")
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — MULTI-STAGE DOCKERFILE
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Containerisierung: Multi-Stage Dockerfile", reqs: [#tag("R2")])[
  Ein einziges Dockerfile mit vier Stages — davon starten *vier Container*: 1× PostgreSQL (DB), 2× `app` (Next.js, skalierbar), 1× `worker`. Die Build-Stages `deps` und `builder` produzieren Artefakte und werden danach verworfen.

  #v(5mm)
  #grid(
    columns: (1fr, auto, 1fr, auto, 1fr, auto, 1fr),
    gutter: 0mm,
    align: horizon,
    // Build stages
    block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: 8pt, width: 100%)[
      #align(center)[
        #text(size: 8pt, fill: c-muted)[BUILD STAGES] \
        #v(2mm)
        #text(weight: "bold", size: 10pt)[`deps`] \
        #text(size: 8pt, fill: c-muted)[`npm ci`, Prisma Schema] \
        #v(2mm)
        #text(weight: "bold", size: 10pt)[`builder`] \
        #text(size: 8pt, fill: c-muted)[`prisma generate`, Next.js Build]
      ]
    ],
    pad(x: 3mm)[#text(size: 11pt, fill: c-muted)[→]],
    // Runtime: app
    block(fill: rgb("#1e3a5f"), stroke: 0.5pt + rgb("#4a8acf"), radius: 2pt, inset: 8pt, width: 100%)[
      #align(center)[
        #text(size: 8pt, fill: c-muted)[RUNTIME IMAGE] \
        #v(2mm)
        #text(weight: "bold", size: 10pt)[`app`] \
        #text(size: 8pt, fill: c-muted)[Next.js Standalone \
        2× Instanz]
      ]
    ],
    pad(x: 3mm)[#text(size: 11pt, fill: c-muted)[+]],
    // Runtime: worker
    block(fill: rgb("#1e3a5f"), stroke: 0.5pt + rgb("#4a8acf"), radius: 2pt, inset: 8pt, width: 100%)[
      #align(center)[
        #text(size: 8pt, fill: c-muted)[RUNTIME IMAGE] \
        #v(2mm)
        #text(weight: "bold", size: 10pt)[`worker`] \
        #text(size: 8pt, fill: c-muted)[Node.js Worker \
        1× Instanz]
      ]
    ],
    pad(x: 3mm)[#text(size: 11pt, fill: c-muted)[+]],
    // Runtime: postgres
    block(fill: rgb("#2a1e3a"), stroke: 0.5pt + rgb("#9a6acf"), radius: 2pt, inset: 8pt, width: 100%)[
      #align(center)[
        #text(size: 8pt, fill: c-muted)[OFFICIAL IMAGE] \
        #v(2mm)
        #text(weight: "bold", size: 10pt)[`db`] \
        #text(size: 8pt, fill: c-muted)[PostgreSQL 18.4 \
        1× Instanz]
      ]
    ],
  )

  #v(5mm)
  - Build-Tools (TypeScript-Compiler, Next.js Build) landen nie im finalen Image
  - `entrypoint.sh` führt `prisma db push` beim Container-Start aus (automatische Migration)
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — NGINX: LOAD BALANCING + FAILOVER
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Load Balancing + Failover", reqs: [#tag("R1")])[
  #grid(
    columns: (1fr, 1fr),
    gutter: 8mm,
    [
      *Load Balancing (R1)*
      - Docker Embedded DNS (`127.0.0.11`) für automatische Service-Auflösung
      - Neue Instanzen werden ohne Nginx-Neustart erkannt
      - `APP_REPLICAS` steuert die horizontale Skalierung
      - `X-Upstream-Addr` Header zeigt die antwortende Instanz

      #v(4mm)
      *Failover*
      - Healthcheck: App-Container melden sich via `/api/health`
      - Nginx leitet erst weiter, wenn Container `healthy`
      - Fällt eine Instanz aus, übernehmen die verbleibenden
      - Getestet: `docker stop raumvote-app-1`, Last läuft weiter
    ],
    [
      *Instanz-Lebenszyklus*

      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(size: 8.5pt)[
          *`docker compose up`* \
          entrypoint: `prisma db push` → `node server.js` \
          Docker prüft `:3000/api/health` alle 10 s \
          nginx startet erst wenn `healthy`
        ]
      ]

      #v(2.5mm)
      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(size: 8.5pt)[
          *Instanz fällt aus* \
          Docker DNS entfernt IP aus `app`-Eintrag \
          nginx löst beim nächsten Request neu auf \
          Traffic geht nur noch an verbleibende Instanz
        ]
      ]

      #v(2.5mm)
      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(size: 8.5pt)[
          *Instanz kommt zurück* \
          `prisma db push` läuft erneut (idempotent) \
          nach Healthcheck: DNS registriert neue IP \
          Round-Robin läuft wieder auf beiden Instanzen
        ]
      ]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — JWT-AUTHENTIFIZIERUNG
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "JWT-Authentifizierung", reqs: [#tag("R4")])[
  #grid(
    columns: (1fr, 1fr),
    gutter: 6mm,
    [
      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(size: 8.5pt, weight: "bold")[Voter-Flow]
        #text(size: 7.5pt, fill: c-muted)[ · `rv-jwt` · 30 Tage]
        #v(3mm)
        #set text(size: 8pt)
        + Admin generiert UUID-Token (QR-Code)
        + Nutzer scannt QR → `POST /api/auth/login`
        + UUID wird in der DB validiert
        + `voterHash = SHA-256(PEPPER:UUID)`
        + JWT `sub = voterHash`, HS256
        + httpOnly-Cookie `rv-jwt` (30 Tage)
        + Alle API-Routen verifizieren Cookie
      ]
      #v(3mm)
      #text(size: 8pt)[*Privacy by Design* — Votes, Likes, Kommentare speichern nur `voterHash`. Rohe UUID nie persistiert. \ *30 Tage* — Nutzer sollen während der gesamten Beteiligungsphase eingeloggt bleiben, ohne sich erneut anzumelden.]
    ],
    [
      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(size: 8.5pt, weight: "bold")[Admin-Flow]
        #text(size: 7.5pt, fill: c-muted)[ · `rv-admin-jwt` · 8 h]
        #v(3mm)
        #set text(size: 8pt)
        + Admin gibt `ADMIN_SECRET` im Login ein
        + `POST /api/admin/auth/login`
        + Server prüft gegen Env-Variable
        + JWT Issuer `raumvote-admin`, HS256
        + httpOnly-Cookie `rv-admin-jwt` (8 h)
        + Alle `/api/admin/*` Routen prüfen Cookie
        + `POST /api/admin/auth/logout` löscht Cookie
      ]
      #v(3mm)
      #text(size: 8pt)[*OWASP* — `httpOnly` · `SameSite: strict` · `secure` in Prod · getrennte Issuer verhindern Token-Verwechslung. \ *8 Stunden* — deckt eine Admin-Arbeitssitzung ab; danach automatischer Logout.]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — PERSISTENTE DATENHALTUNG + SINGLE-COMMAND SETUP
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Persistente Datenhaltung + Single-Command Setup", reqs: [#tag("R5") #tag("R6")])[
  #grid(
    columns: (1fr, 1fr),
    gutter: 8mm,
    [
      *Persistent Storage (R5)*
      - *PostgreSQL 18.4* im Docker-Stack — lokaler Container, kein externe Abhängigkeit
      - Prisma ORM: Schema-Migrationen, typsichere Queries
      - Docker Volumes für Monitoring-Daten:
        - `influxdb-data`: Zeitreihendaten
        - `loki-data`: Log-Archive
        - `grafana-data`: Dashboard-Konfiguration

      #v(3mm)
      Monitoring-Daten überleben Container-Neustarts. Erst `docker compose down -v` löscht Volumes.
    ],
    [
      *Single-Command Setup (R6)*

      #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 6pt), width: 100%)[
        #text(font: "Courier New", size: 9pt)[
          \# App-Stack \
          docker compose up \
          \
          \# App + Monitoring \
          docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up
        ]
      ]

      #v(3mm)
      - `prisma db push` läuft automatisch beim Start
      - Grafana Datasources und Dashboards auto-provisioniert
      - Einzige Voraussetzung: `.env`-Datei mit Secrets
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — MONITORING STACK
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Monitoring Stack", reqs: [#tag("R3")])[
  #set text(size: 9pt)
  Zwei Datentypen brauchen zwei Pipelines — beide landen in *Grafana* (Port 3001).
  #v(3mm)

  #let tool-box(name, role, desc) = block(
    width: 100%, inset: (x: 9pt, y: 7pt),
    fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt,
  )[
    #grid(columns: (1fr, auto), align: (left, right),
      text(weight: "bold", size: 9.5pt)[#name],
      text(fill: c-muted, size: 7.5pt)[#role],
    )
    #v(2pt)
    #text(size: 8pt, fill: c-text)[#desc]
  ]
  #let arrow = align(center)[#text(fill: c-muted, size: 10pt)[↓]]

  #grid(
    columns: (1fr, 4mm, 1fr),
    gutter: 0mm,
    [
      #align(center)[#text(weight: "bold", size: 8.5pt)[METRIKEN] #text(fill: c-muted, size: 8pt)[— Zahlen über Zeit]]
      #v(2mm)
      #tool-box("Telegraf", "Collector")[Liest CPU, RAM und Netzwerk aller Docker-Container alle 10 Sekunden aus]
      #arrow
      #tool-box("InfluxDB", "Datenbank für Metriken")[Speichert die Messwerte zeitgestempelt — optimiert für Abfragen wie «letzten 30 Min. CPU»]
      #arrow
      #tool-box("Grafana", "Dashboard")[Liest aus InfluxDB und zeigt Echtzeit-Grafiken: CPU, RAM, Req/s, Latenz]
    ],
    [],
    [
      #align(center)[#text(weight: "bold", size: 8.5pt)[LOGS] #text(fill: c-muted, size: 8pt)[— Text-Ereignisse]]
      #v(2mm)
      #tool-box("Promtail", "Log-Collector")[Liest den Text-Output (stdout) aller Container in Echtzeit — z.B. nginx-Requests, Fehler]
      #arrow
      #tool-box("Loki", "Datenbank für Logs")[Speichert und indiziert Logs nach Container und Status-Code — durchsuchbar in Grafana]
      #arrow
      #tool-box("Grafana", "Dashboard")[Zeigt Log-Einträge gefiltert nach Zeit, Container oder Fehlermeldung]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — LOAD TEST ERGEBNISSE
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Load Test Ergebnisse", reqs: [#tag("R7")])[
  #set text(size: 8.5pt)
  Tool: `hey` (externer CLI-Benchmark). 2× App-Instanzen, nginx Round-Robin, DB Pool 10 pro Instanz, PostgreSQL (Docker). Zusätzlich: integrierter Admin-Benchmark für Pre/Post-Failover-Vergleich.

  #v(2mm)
  #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 8pt, y: 5pt), width: 100%)[
    #set text(size: 8pt)
    #grid(
      columns: (2.0fr, 1.8fr, 0.55fr, 0.6fr, 0.6fr, 0.5fr, 0.5fr),
      column-gutter: 3mm,
      row-gutter: 2mm,
      text(weight: "bold", fill: c-muted)[Szenario],
      text(weight: "bold", fill: c-muted)[Was wird gemessen?],
      text(weight: "bold", fill: c-muted)[Req],
      text(weight: "bold", fill: c-muted)[Conc.],
      text(weight: "bold", fill: c-muted)[Req/s],
      text(weight: "bold", fill: c-muted)[Avg],
      text(weight: "bold", fill: c-muted)[P99],

      [Baseline (`/api/auth/me`)],     [JWT-Check, kein DB-Zugriff],          [1000], [50],  text(weight: "bold")[1813], [24 ms], [58 ms],
      [High Concurrency],              [200 gleichzeitige Verbindungen],       [2000], [200], text(weight: "bold")[2682], [64 ms], [137 ms],
      [Sustained Load (5000 Req)],     [Dauerlast, höherer Gesamtdurchsatz],   [5000], [100], text(weight: "bold")[3132], [30 ms], [74 ms],
      [Vote Status (JWT + DB)],        [JWT + PostgreSQL-Query (End-to-End)],  [1000], [50],  text(weight: "bold")[2350], [20 ms], [36 ms],
    )
  ]

  #v(2mm)
  #grid(
    columns: (1fr, 1fr),
    gutter: 6mm,
    [
      *Beobachtungen*
      - Vote Status nur 3 ms langsamer als Baseline — lokale DB eliminiert Netzwerk-Roundtrip
      - High Concurrency: P99 springt auf 137 ms → Connection-Pool-Queueing bei > 20 gleichzeitigen DB-Queries sichtbar
      - 0 Fehler über alle 9000 Requests
    ],
    [
      *Failover-Verhalten* (Admin-Benchmark)
      - `docker stop raumvote-app-1` während Pre/Post-Test
      - nginx leitet sofort an App-2 weiter
      - 0 fehlgeschlagene Requests
      - Durchsatz −14 bis −31% (nicht −50%: Pool-Effizienz pro Instanz steigt)
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 11 — DESIGN-ENTSCHEIDUNGEN
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Design-Entscheidungen")[
  #grid(
    columns: (1fr, 1fr),
    gutter: 8mm,
    [
      *Infrastructure as Code*
      - Grafana Datasources und Dashboards werden beim Start automatisch provisioniert, keine manuelle Konfiguration nach `docker compose up`
      - Alle Credentials über Umgebungsvariablen

      #v(4mm)
      *Separation of Concerns*
      - Zwei `docker-compose`-Files: App-Stack vs. Monitoring-Stack
      - Monitoring kann unabhängig gestartet und gestoppt werden
    ],
    [
      *Observability First*
      - Strukturiertes JSON-Logging in Nginx, Next.js und Worker
      - `X-Instance-Id` und `X-Upstream-Addr` für Request-Traceability
      - Telegraf als universeller Pull-basierter Metriken-Aggregator

      #v(4mm)
      *Privacy by Design*
      - Raw UUID verlässt nie den Server
      - Alle DB-Records verwenden `voterHash` (SHA-256)
      - `VOTER_PEPPER` verhindert Brute-Force-Angriffe auf Hashes
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 12 — DEMO
// ─────────────────────────────────────────────────────────────────────────────

#section-slide("Demo", subtitle: "docker compose up · Grafana · Load Test")

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 13 — DEMO GUIDE
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Demo")[
  #set text(size: 9pt)

  #let step(n, title, body) = block(
    width: 100%,
    inset: (x: 10pt, y: 8pt),
    fill: c-surface,
    stroke: 0.5pt + c-border,
    radius: 2pt,
  )[
    #grid(
      columns: (18pt, 1fr),
      column-gutter: 8pt,
      align: (center + top, left + top),
      text(weight: "bold", fill: c-muted, size: 11pt)[#n],
      [*#title* \ #body],
    )
  ]

  #v(2mm)
  #step("1", "Stack starten")[
    ```
    docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up
    ```
    App · Worker · nginx · PostgreSQL · Grafana · InfluxDB · Loki
  ]
  #v(2mm)
  #step("2", "Was ist RaumVote?")[
    `http://localhost` — QR-Login scannen · Entscheidungsbaum navigieren · Option wählen und abstimmen
  ]
  #v(2mm)
  #step("3", "Admin Panel & Statistiken")[
    `http://localhost/admin` — Tokens · Session · Infra-Dashboard · Grafana-Embed (Nginx, Load Test, Logs)
  ]
  #v(2mm)
  #step("4", "Load Test — Failover")[
    Admin › Infra › Load Balancer: *Pre-Test starten* \
    In neuem Terminal: `docker stop raumvote-app-1` \
    *Post-Test starten* — Vergleich: Durchsatz −14 bis −31%, 0 Fehler
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 14 — Q&A
// ─────────────────────────────────────────────────────────────────────────────

#section-slide("Fragen?", subtitle: "Jovin Risch")
