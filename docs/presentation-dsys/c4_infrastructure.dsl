workspace "RaumVote Infrastructure" "DSys FS26 – Containerisierte Infrastruktur" {

    !identifiers hierarchical

    model {
        u     = person "Nutzer" "Scannt QR-Code, navigiert Entscheidungsbaum, stimmt ab"
        admin = person "Admin"  "Verwaltet Sessions, Tokens und Bildgenerierung"

        openai = softwareSystem "OpenAI API" {
            description "GPT-4o, Tree Node Generation"
            tags "External"
        }
        gemini = softwareSystem "Google Gemini API" {
            description "gemini-2.0-flash, Image Generation"
            tags "External"
        }
        r2 = softwareSystem "Cloudflare R2" {
            description "Object Storage für generierte Bilder"
            tags "External"
        }

        rv = softwareSystem "RaumVote" "Digitales Beteiligungsformat für Jugendpartizipation" {

            nginx    = container "nginx"    "Reverse Proxy & Round-Robin Load Balancer" "nginx:alpine" {
                tags "App"
            }
            app      = container "app"      "Next.js Web Application (APP_REPLICAS=2)"  "Node.js 22, Next.js 16" {
                tags "App"
            }
            worker   = container "worker"   "AI-Bildgenerierungs-Worker (async, polling)" "Node.js 22, TypeScript" {
                tags "App"
            }
            db       = container "postgres" "Relationale Datenbank mit persistentem Volume" "PostgreSQL" {
                tags "App" "Database"
            }

            telegraf = container "Telegraf" "Metriken-Aggregator: Docker Stats, Nginx, App-Health" "telegraf:1.38" {
                tags "Monitoring"
            }
            influxdb = container "InfluxDB" "Zeitreihendatenbank für Metriken" "influxdb:2.8" {
                tags "Monitoring" "Database"
            }
            promtail = container "Promtail" "Log-Shipper via Docker Socket" "grafana/promtail:3.6" {
                tags "Monitoring"
            }
            loki     = container "Loki"     "Log-Aggregation und Indexierung" "grafana/loki:3.6" {
                tags "Monitoring"
            }
            grafana  = container "Grafana"  "Monitoring Dashboards, auto-provisioniert" "grafana:11.6, Port 3001" {
                tags "Monitoring"
            }
        }

        u          -> rv.nginx    "HTTP :80"
        admin      -> rv.nginx    "HTTP :80 (Admin UI)"
        rv.nginx   -> rv.app      "proxy_pass, Round-Robin"
        rv.app     -> rv.db       "Prisma ORM"
        rv.worker  -> rv.db       "Prisma ORM, Job Polling"

        rv.telegraf -> rv.nginx    "scrapes stub_status"
        rv.telegraf -> rv.app      "scrapes /api/health + /api/metrics"
        rv.telegraf -> rv.influxdb "Push alle 10 s"

        rv.promtail -> rv.loki     "Push via Docker SD"

        rv.grafana  -> rv.influxdb "Flux Queries"
        rv.grafana  -> rv.loki     "LogQL Queries"
        rv.app      -> rv.grafana  "iframe eingebettet (Admin-Dashboard)"

        rv.worker   -> openai      "Tree Node Generation (GPT-4o)"
        rv.worker   -> gemini      "Image Generation (gemini-2.0-flash)"
        gemini      -> r2          "Generierte Bilder ablegen"
        rv.app      -> r2          "Bild-URLs lesen"
    }

    views {
        systemContext rv "SystemContext" {
            include *
            properties {
                "structurizr.backgroundColor" "#0d0d0d"
            }
        }

        container rv "Containers" {
            include *
            properties {
                "structurizr.backgroundColor" "#0d0d0d"
            }
        }

        styles {
            element "Element" {
                color #ececec
                stroke #555555
                strokeWidth 3
                shape roundedbox
            }
            element "Person" {
                shape person
                background #1a1a1a
                stroke #888888
            }
            element "Software System" {
                background #1a3a6b
                stroke #4a7abf
            }
            element "App" {
                background #1e3a5f
                stroke #4a8acf
            }
            element "Monitoring" {
                background #1a3a2a
                stroke #4aaf7f
            }
            element "Database" {
                shape cylinder
            }
            element "External" {
                background #2a2a2a
                stroke #888888
                color #aaaaaa
            }
            element "Boundary" {
                strokeWidth 4
            }
            relationship "Relationship" {
                thickness 2
                color #888888
            }
        }
    }

    configuration {
        scope softwaresystem
    }

}
