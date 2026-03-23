# RaumVote -- Technische Dokumentation


## 1. Uebersicht

RaumVote ist eine Mobile-First-Abstimmungsanwendung, bei der Nutzer durch KI-generierte binaere Entscheidungsbaeume navigieren, indem sie nach links oder rechts wischen. Jede Auswahl teilt sich in zwei neue Optionen auf, bis der Nutzer ein Blatt erreicht, fuer das abgestimmt werden kann. Die Anwendung basiert auf Next.js 16 (App Router), React 19, Prisma 7 mit PostgreSQL (Neon) und nutzt GPT-4o fuer die Baumgenerierung sowie Gemini/HuggingFace fuer die Bildgenerierung.

Die gesamte Benutzeroberflaeche ist auf Deutsch gehalten (z.B. "Profil", "Ergebnisse", "Abstimmung laeuft").


## 2. Architektur

### 2.1 Sessions und Entscheidungsbaeume

Das zentrale Datenmodell ist die VotingSession. Jede Session besitzt einen vollstaendigen binaeren Entscheidungsbaum. Sessions durchlaufen folgenden Lebenszyklus: draft (Entwurf) -> active (aktiv) -> archived (archiviert). Es darf jeweils nur eine Session im Zustand "draft" oder "active" existieren. Archivierte Sessions sind schreibgeschuetzt.

Baumknoten (TreeNode) werden in einer selbstreferenzierenden Tabelle gespeichert. Jeder Knoten besitzt eine parentId, eine Seite (side: "left" oder "right") und eine Tiefe (depth). Ein Unique-Constraint auf (parentId, side) garantiert die binaere Struktur. Der Wurzelknoten hat side = null und depth = 0.

Wenn ein Nutzer zu einem Knoten navigiert, dessen Kinder noch nicht generiert wurden, ruft das System GPT-4o mit dem vollstaendigen Pfad vom Wurzelknoten zum aktuellen Knoten (der sogenannten "Episode") als Kontext auf. Die KI liefert eine Frage und zwei Kindoptionen mit Titel, Beschreibung und Kontext zurueck. Diese On-Demand-Generierung bedeutet, dass der Baum organisch waechst, waehrend Nutzer ihn erkunden.

### 2.2 Datenbankschema

Das PostgreSQL-Schema (verwaltet durch Prisma) besteht aus 10 Modellen:

- VotingSession: Wurzelaggregat. Enthaelt die Baumkonfiguration (System-Prompt, Modell, Bildeinstellungen), Zeitsteuerung (Dauer, Start/Ende) und Status. Kaskadierendes Loeschen aller untergeordneten Datensaetze.

- TreeNode: Binaerer Baumknoten. Speichert titel, beschreibung, context, question, mediaUrl, Discovery-Tracking (discovererHash, discoveredAt) und einen Besuchszaehler (amountVisits).

- Vote: Eine Stimme pro Waehler pro Session. Unique auf (sessionId, voterHash). Speichert die gewaehlte optionId (eine Blattknoten-ID).

- Like: Ein Like pro Waehler pro Option pro Session. Unique auf (sessionId, optionId, voterHash).

- Comment: Verschachtelte Kommentare zu Optionen. Selbstreferenzierende parentId fuer Antworten. Indiziert auf (sessionId, optionId, createdAt).

- CommentLike: Ein Like pro Waehler pro Kommentar. Unique auf (commentId, voterHash).

- User: Profildaten. Schluessel ist voterHash. Speichert optionalen username und avatarUrl (Base64-Daten-URL, skaliert auf 160x160 Pixel).

- AccessToken: Vorab erstellte UUID-Tokens, die per QR-Code verteilt werden. Besitzt ein active-Flag zur Deaktivierung.

- ImageTask: Verfolgt Bildgenerierungsauftraege pro Knoten. Status-Lebenszyklus: pending -> generating -> completed/failed.

- JobQueue: Allgemeine Job-Warteschlange fuer Hintergrundarbeiten (Vor-Generierung, Bildverarbeitung). Nutzt SELECT ... FOR UPDATE SKIP LOCKED fuer sichere Nebenlaeufigkeit.

### 2.3 Projektstruktur

app/                    Next.js App Router -- Seiten und API-Routen
  api/                  33 API-Endpunkte (Admin, Auth, Tree, Vote, Like, Comment, Results usw.)
  n/[nodeId]/           Split-Screen binaere Auswahl-UI (Hauptabstimmungsseite)
  o/[optionId]/         Einzelne Optionsdetailansicht
  login/[token]/        QR-Code-Login-Ablauf
  start/                Willkommensbildschirm mit PWA-Installationshinweisen
  results/              Bestenliste
  dream/                Aktuelle Wahl des Nutzers
  me/                   Profilbearbeitung
  admin/                Admin-Dashboard (Sessions, Tokens, Knoten, Bilder, Infrastruktur)
  denied/               Zugang-verweigert-Seite
components/             Geteilte UI-Komponenten (ActionRail, CommentBottomSheet, GlobalTabbar usw.)
lib/                    21 Hilfsmodule (Auth, Tree, Voting, Bildgenerierung, Queue usw.)
prisma/                 Schema und Migrationen
middleware.ts           JWT-Verifizierung und Request-Logging
worker.ts               Eigenstaendiger Hintergrund-Job-Prozessor


## 3. Authentifizierung und Datenschutz

### 3.1 Token-basierter Zugang

Der Zugang wird ueber vorab erstellte Tokens gesteuert. Ein Administrator generiert UUID-Tokens ueber die /admin-Oberflaeche, die in der AccessToken-Tabelle gespeichert werden. Diese Tokens werden als QR-Codes verteilt, die die URL /login/{token} kodieren.

Wenn ein Nutzer einen QR-Code scannt, laeuft folgender Prozess ab:

1. Der Browser navigiert zu /login/{token}.
2. Der Client ruft POST /api/auth/login mit dem Token auf.
3. Der Server validiert das Token gegen die AccessToken-Tabelle (muss existieren und active sein).
4. Bei Gueltigkeit signiert der Server ein JWT mit dem Voter-Hash und setzt es als httpOnly-Cookie (rv-jwt, 30 Tage Gueltigkeit).
5. Die rohe voterId wird zusaetzlich in localStorage als Fallback fuer Offline-Szenarien gespeichert.
6. Der Nutzer wird zu /start weitergeleitet.

### 3.2 Datenschutz der Waehler

Rohe Voter-Tokens werden niemals in Abstimmungs-, Like- oder Kommentardatensaetzen gespeichert. Alle Datenbankeintraege verwenden einen voterHash -- einen SHA-256-Hash aus {VOTER_PEPPER}:{voterId}. Die Umgebungsvariable VOTER_PEPPER ist zwingend erforderlich; die Anwendung bricht beim Start ab, wenn sie fehlt.

Bei jeder API-Anfrage wird die Waehleridentitaet in folgender Reihenfolge aufgeloest:

1. Pruefung des x-voter-hash-Headers (durch Middleware aus dem JWT-Cookie gesetzt) -- schnellster Pfad.
2. Fallback: Extraktion der voterId aus dem Request-Body oder den Query-Parametern, Validierung gegen AccessToken, anschliessendes Hashing.

Der useAuth()-React-Hook verwaltet den clientseitigen Authentifizierungsstatus. Er prueft localStorage auf eine gespeicherte voterId, validiert sie ueber /api/auth/me und leitet bei ungueltigem oder fehlendem Token zu /denied weiter.


## 4. Kernfunktionen

### 4.1 Abstimmungsmechanismus

Die Abstimmung nutzt ein Toggle/Upsert-Muster. Jeder Waehler kann hoechstens eine aktive Stimme pro Session abgeben (erzwungen durch einen Unique-Constraint auf sessionId + voterHash).

Beim Aufruf von POST /api/vote mit { sessionId, optionId, voterId } gilt:

- Hat der Waehler bereits fuer dieselbe Option gestimmt, wird die Stimme geloescht (Toggle aus).
- Hat der Waehler fuer eine andere Option gestimmt oder noch nicht abgestimmt, wird die Stimme per Upsert auf die neue Option gesetzt.

Dasselbe Toggle-Muster gilt fuer Likes (POST /api/like) und Kommentar-Likes (POST /api/comment/like). Die Session muss aktiv sein und sich innerhalb ihrer Frist (startedAt + durationDays) befinden, damit Abstimmungen akzeptiert werden.

### 4.2 Baumgenerierung

Baumknoten werden bei Bedarf ueber GPT-4o generiert. Wenn ein Nutzer zu einem Knoten navigiert, dessen Kinder noch nicht existieren, geschieht Folgendes:

1. Das System traversiert vom aktuellen Knoten zurueck zur Wurzel und sammelt den vollstaendigen Pfad (die "Episode").
2. Die Episode wird an GPT-4o mit dem systemPrompt der Session und einer strukturierten JSON-Schema-Ausgabe gesendet.
3. GPT-4o liefert eine Frage und zwei Kindknoten (links/rechts), jeweils mit titel, beschreibung und context.
4. Die neuen Knoten werden in der Datenbank persistiert.
5. Bildgenerierungsauftraege werden fuer die neuen Knoten in die Warteschlange eingereiht.

Vor-Generierung: Um die Latenz zu reduzieren, loest der Client einen prefetchGenerate()-Aufruf aus, wenn ein Nutzer auf einer Knotenseite landet. Damit werden Enkel-Knoten voraus generiert, sodass die naechste Navigation sofort erfolgt. Die JobQueue unterstuetzt Hintergrund-Vor-Generierungsjobs, die Nachkommen rekursiv bis zu einer konfigurierbaren Tiefe erzeugen.

### 4.3 Bildgenerierung

Jeder Baumknoten besitzt eine mediaUrl, die zunaechst auf einen Platzhalter verweist. Die Bildgenerierung erfolgt asynchron:

1. Beim Erstellen neuer Knoten werden ImageTask-Datensaetze mit Status "pending" angelegt.
2. Ein Worker (eigenstaendiger worker.ts oder Inline-Fire-and-Forget) beansprucht Aufgaben mittels optimistischem Locking: UPDATE ... WHERE status = 'pending' mit SKIP LOCKED.
3. Der Worker ruft das konfigurierte Bildmodell auf (Gemini gemini-2.0-flash-preview-image-generation oder HuggingFace-Modelle mit dem Praefix hf:).
4. Generierte Bilder werden auf Cloudflare R2 hochgeladen und die mediaUrl des Knotens wird aktualisiert.
5. Der Client pollt GET /api/tree/node/images alle 3 Sekunden, bis die Bilder beider Kindknoten keine Platzhalter mehr sind.

Aufgaben, die laenger als 5 Minuten im Status "generating" verbleiben, werden automatisch als fehlgeschlagen markiert. Das Admin-Dashboard bietet Steuerungen zum erneuten Versuch fehlgeschlagener Aufgaben, zum Nachgenerieren fehlender Bilder und zum Bereinigen abgeschlossener Aufgaben.

### 4.4 Discovery-System

Der erste Nutzer, der einen bisher unbesuchten Knoten besucht, wird als dessen Entdecker erfasst (discovererHash, discoveredAt). Die UI zeigt ein Feier-Modal (ueber DiscoveryRevealCard), wenn isDiscoverer in der Generierungsantwort true ist. Jeder Knoten zaehlt ausserdem seine Besuche ueber amountVisits als Popularitaetszaehler. Das Discovery-Feature kann pro Session ueber das discoveryEnabled-Flag aktiviert oder deaktiviert werden.


## 5. API-Design

Alle API-Routen folgen einem einheitlichen Muster:

1. Parameter extrahieren und validieren (Query-Parameter bei GET, JSON-Body bei POST).
2. Waehleridentitaet ueber getVoterHash() aufloesen (JWT-Header oder Legacy-Token).
3. Datenbankoperation ueber Prisma ausfuehren.
4. JSON-Antwort zurueckgeben.

Admin-Endpunkte (/api/admin/*) erfordern einen Authorization-Header mit Bearer {ADMIN_SECRET}. Session-Statusuebergaenge werden ueber PATCH /api/admin/session mit Aktionsparametern (start, archive, set-default) gesteuert. Feldaenderungen sind nach Session-Status eingeschraenkt -- Entwurfssessions erlauben alle Aenderungen, aktive Sessions nur eine Teilmenge, und archivierte Sessions sind unveraenderlich.

Wichtige API-Endpunkte:

Auth:
  /api/auth/login, /api/auth/validate, /api/auth/me
  Token-Austausch, JWT-Ausstellung, Identitaetspruefung

Tree:
  /api/tree/node, /api/tree/generate, /api/tree/node/images
  Knotendaten, On-Demand-Generierung, Bild-Polling

Voting:
  /api/vote, /api/vote/status
  Stimmen-Toggle und Statusabfrage

Social:
  /api/like, /api/comment, /api/comment/like
  Likes und verschachtelte Kommentare zu Optionen

Session:
  /api/session, /api/results
  Aktive Session-Metadaten und Abstimmungs-Bestenliste

Admin:
  /api/admin/session, /api/admin/tokens, /api/admin/image-tasks, /api/admin/tree-reset
  Vollstaendiges CRUD fuer Sessions, Tokens und Bildaufgaben


## 6. Frontend-Architektur

### 6.1 Responsives Design

Die Anwendung nutzt ein JavaScript-basiertes responsives System (useResponsive-Hook) mit drei Breakpoints:

- Small (unter 540px): Hochformat-Smartphone -- Standard-Mobilansicht.
- Medium (540px bis 1080px): Querformat-Tablet.
- Large (ab 1080px): Desktop.

Der Hook liefert skalierte Werte fuer Schriftgroessen, Abstaende, Eckradien, ActionRail-Dimensionen und Tab-Bar-Hoehe. Styles werden als Inline-React.CSSProperties-Objekte definiert (typischerweise als const s: Record<string, React.CSSProperties> am Ende jeder Komponentendatei). Tailwind ist importiert, wird aber selten direkt verwendet.

### 6.2 Geteilte Komponenten

ActionRail: Eine vertikale Spalte aus 52px grossen runden Buttons (TikTok-Stil) fuer Like-, Abstimmungs-, Kommentar- und Teilen-Aktionen. Unterstuetzt Badge-Zaehler, aktive Zustaende mit konfigurierbaren Farben und nutzt e.stopPropagation(), um Klick-Bubbling von verschachtelten Elternelementen zu verhindern.

CommentBottomSheet: Ein fixiertes Bottom-Sheet (60% der Viewport-Hoehe, z-index 201) mit Ziehgriff, scrollbarem Kommentar-Thread, Antwort-Unterstuetzung und Like-Toggles. Zeichenlimit: 500.

GlobalTabbar: Fixierte Fussnavigation (64px Hoehe, z-index 100) mit 4 Tabs: Start, Ergebnisse, Traum und Profil. Ausgeblendet auf Admin-, Login- und Zugang-verweigert-Seiten. Alle Seiteninhalte muessen 64px unteren Abstand beruecksichtigen.

### 6.3 Wisch-Navigation

Die binaere Auswahlseite (/n/[nodeId]) nutzt einen eigenen useSwipeChoice-Hook fuer Gestenerkennung. Nutzer koennen nach links oder rechts wischen oder ziehen, um eine Auswahl zu treffen. Die Seite verfuegt ausserdem ueber eine Leerlauf-Kippanimation bei fehlender Nutzereingabe und unterstuetzt Tastaturnavigation.


## 7. Hintergrundverarbeitung

### 7.1 Eigenstaendiger Worker

Die Datei worker.ts stellt einen eigenstaendigen Node.js-Prozess fuer Deployment-Umgebungen wie Docker oder Railway bereit:

  npx tsx worker.ts

Der Worker fuehrt eine Polling-Schleife alle 2 Sekunden aus:

1. Beanspruchung von bis zu 3 wartenden ImageTask-Datensaetzen mittels SKIP LOCKED zur Vermeidung von Race Conditions.
2. Verarbeitung jeder Aufgabe (Bild generieren, auf R2 hochladen, Knoten aktualisieren).
3. Beanspruchung wartender JobQueue-Eintraege fuer Vor-Generierungsarbeiten.
4. Rekursive Generierung von Nachkommenknoten und Einreihung weiterer Unterauftraege.

### 7.2 Inline-Verarbeitung

In Umgebungen ohne dedizierten Worker (z.B. Vercel mit seinem 10-Sekunden-Funktions-Timeout) werden Bildaufgaben inline ueber processImageTasksInBackground() verarbeitet -- ein Fire-and-Forget-Aufruf, der nach dem Senden der API-Antwort ausgefuehrt wird. Optimistisches Locking stellt sicher, dass keine doppelte Arbeit entsteht, wenn sowohl ein Worker als auch die Inline-Verarbeitung aktiv sind.


## 8. Deployment und Konfiguration

### 8.1 Umgebungsvariablen

Erforderlich:
- DATABASE_URL: Neon-Pooled-PostgreSQL-Verbindungsstring
- DIRECT_URL: Neon-Direktverbindung (fuer Migrationen)
- VOTER_PEPPER: Geheimer Pepper fuer SHA-256-Voter-ID-Hashing
- ADMIN_SECRET: Bearer-Token fuer Admin-API-Zugriff

Optional:
- JWT_SECRET: JWT-Signierungsgeheimnis (Fallback auf VOTER_PEPPER)
- OPENAI_API_KEY: GPT-4o-API-Schluessel fuer Baumgenerierung
- GEMINI_API_KEY: Gemini-API-Schluessel fuer Bildgenerierung
- R2_ENDPOINT: Cloudflare-R2-S3-kompatibler Endpunkt
- R2_ACCESS_KEY_ID: R2-Zugangsdaten
- R2_SECRET_ACCESS_KEY: R2-Zugangsdaten (Secret)
- R2_BUCKET_NAME: R2-Bucket-Name
- R2_PUBLIC_URL: Oeffentliches URL-Praefix fuer R2-Assets

### 8.2 Build und Ausfuehrung

  npm run build          Prisma-Client generieren + Next.js bauen
  npm run dev            Entwicklungsserver starten
  npm run lint           ESLint-Pruefungen ausfuehren
  npx tsx worker.ts      Hintergrund-Worker starten (Produktion)

Die Next.js-Konfiguration nutzt output: "standalone" fuer Docker-kompatible Builds. Bild-Remote-Patterns erlauben alle HTTPS-Hosts fuer R2-gehostete Inhalte.

### 8.3 Datenbankmigrationen

  npx prisma migrate dev --name <Migrationsname>    Migration erstellen und anwenden
  npx prisma generate                                Prisma-Client neu generieren

Prisma verwendet den PrismaPg-Adapter fuer Neons gepoolte Verbindungen. Die Schema-Evolution wird ueber 11 Migrationsdateien nachverfolgt.
