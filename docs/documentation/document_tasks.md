# RaumVote IKTS Projektarbeit – Review-Aufgaben für Claude Code

## Kontext

Die Datei `IKTS_Arbeit__1_.docx` enthält eine IKTS Projektarbeit (FS26, OST) von Felix Schiess, Jovin Risch und Luis Würgler. Das Projekt heisst "RaumVote" und ist ein digitales Beteiligungstool für Jugendpartizipation im öffentlichen Raum.

Die Arbeit soll in ein Typst-Dokument (.typ) überführt und dabei bereinigt und verbessert werden. Das finale Abgabeformat ist PDF. Bitte extrahiere zuerst den Text aus der .docx-Datei und erstelle daraus ein sauberes Typst-Dokument.

---

## Phase 1: Template-Bereinigung

Diese Änderungen sind mechanisch und erfordern keine inhaltliche Entscheidung.

### 1.1 Titel ersetzen

- **Alt:** "Hier kann der lange und ausführliche Titel der Arbeit auf mehreren Zeilen aufgeführt werden"
- **Neu:** "RaumVote: Ein digitales Beteiligungsformat zur Förderung der Jugendpartizipation im öffentlichen Raum"

### 1.2 Platzhalter entfernen

- "[Auftraggeber – Logo]" auf der Titelseite entfernen

### 1.3 Verzeichnisse bereinigen

- **Löschen** (fachfremd/leer):
  - "Tabelle 1: Wichtige Shortcuts"
  - "Formel 1: Zugfestigkeit bei Gewindebruch"
  - Leeres Abbildungsverzeichnis
  - Leerer Abschnitt "Symbole, Formelzeichen, Einheiten"
- **Behalten:** "Begriffe und Definitionen" (hat echten Inhalt)
- **Befüllen:** Abkürzungsverzeichnis mit folgenden Einträgen:

| Abkürzung | Bedeutung                         |
| --------- | --------------------------------- |
| API       | Application Programming Interface |
| DSGVO     | Datenschutz-Grundverordnung       |
| JWT       | JSON Web Token                    |
| KI        | Künstliche Intelligenz            |
| MVP       | Minimal Viable Product            |
| ORM       | Object-Relational Mapping         |
| PWA       | Progressive Web App               |
| QR        | Quick Response                    |
| SHA       | Secure Hash Algorithm             |
| UI        | User Interface                    |
| UUID      | Universally Unique Identifier     |
| UX        | User Experience                   |

### 1.4 Anhang-Platzhalter

- "A. Anhang1" umbenennen zu "A. Prozessübersicht" (oder passenden Titel)

### 1.5 Footer-Reste

- "Dokumentname: Dokument2 Druck: 31.08.2021" entfernen
- "Fehler! Unbekannter Name für Dokument-Eigenschaft." entfernen

### 1.6 Doppelter Satz in Kapitel 2.3

- Folgender Satz steht zweimal direkt hintereinander in "Logo-Konzept": "Durch die Verschmelzung dieser beiden Elemente entsteht ein visuelles Zeichen für digitale Partizipation im öffentlichen Raum."
- Zweites Vorkommen löschen. Der verbleibende Absatz soll lauten: "Durch die Verschmelzung dieser beiden Elemente entsteht ein visuelles Zeichen für digitale Partizipation im öffentlichen Raum. Somit transportiert das Logo die Kernidee des Projekts: die Verbindung von Ort und Mitbestimmung."

---

## Phase 2: Management Summary kürzen

Das Management Summary ist zu lang und wiederholt Inhalte aus späteren Kapiteln fast wörtlich. Kürze es auf ca. eine halbe Seite (ca. 200-250 Wörter). Behalte folgende Kernaussagen:

1. Problem: Jugendliche werden in kommunalen Planungsprozessen unzureichend berücksichtigt
2. Lösung: RaumVote als digitales, mobiles Beteiligungstool
3. Methode: Mobile-First, binäre Entscheidungsbäume, QR-Code-Zugang, Privacy-by-Design
4. Ergebnis: Funktionaler MVP mit Token-Konzept, Kommunikationsstrategie und Testkonzept
5. Fazit: Prototyp zeigt Potenzial für Weiterentwicklung und realen Einsatz

Streiche alle Details, die in den Hauptkapiteln ausgeführt werden.

---

## Phase 3: Einleitung überarbeiten

### 3.1 Aufbau der Arbeit ergänzen

Am Ende der Einleitung fehlt ein Absatz, der den Aufbau der Arbeit beschreibt. Ergänze nach der Leitfrage einen Absatz wie:

> Die Arbeit gliedert sich wie folgt: Zunächst wird die Firmenidentität von RaumVote vorgestellt (Kapitel 2). Anschliessend werden die funktionalen Anforderungen in Form von User Stories formuliert (Kapitel 3) und der MVP definiert (Kapitel 4). Der Beteiligungsprozess wird in Kapitel 5 beschrieben, die Kommunikationsstrategie in Kapitel 6 und das Token-Konzept in Kapitel 7. Kapitel 8 dokumentiert das Testkonzept. Die technische Dokumentation in Kapitel 9 beschreibt Architektur, Implementierung und Betrieb des Systems.

### 3.2 Letzten Absatz straffen

Der letzte Absatz ("Mit der Entwicklung von RaumVote wird ein möglicher Lösungsansatz aufgezeigt...") ist redundant zum vorherigen. Kann gestrichen oder in einen Satz kondensiert werden.

---

## Phase 4: Kapitel "Stand der Forschung" neu erstellen

Zwischen Einleitung (Kapitel 1) und Firmenidentifikation (Kapitel 2) fehlt ein Kapitel zum Stand der Forschung. Erstelle ein neues **Kapitel 2: Stand der Forschung und bestehende Ansätze** (alle nachfolgenden Kapitel verschieben sich um eins).

Das Kapitel soll folgende Punkte abdecken (ca. 1-1.5 Seiten):

### 4.1 Partizipationsforschung

- Kurze Einordnung: Stufen der Partizipation (informieren, konsultieren, mitentscheiden)
- Bezug zu Jugendpartizipation im öffentlichen Raum
- Hinweis auf rechtliche Grundlagen (z.B. UN-Kinderrechtskonvention Art. 12)

### 4.2 Bestehende digitale Beteiligungstools

- Decidim (Barcelona, Open Source, eher für Erwachsene)
- Consul (Madrid, ähnlich)
- meinBerlin / Beteiligung.NRW (DE-Kontext)
- Hinweis: Diese Tools sind primär für erwachsene Zielgruppen konzipiert und erfordern i.d.R. Registrierung
- Forschungslücke: Jugendspezifische, anonyme, gamifizierte Formate fehlen

### 4.3 Positionierung von RaumVote

- Abgrenzung zu bestehenden Tools
- Alleinstellungsmerkmale: anonym, gamifiziert, Mobile-First, binäre Entscheidungsbäume

**Hinweis:** Die Autoren müssen die Quellen selbst verifizieren und das Literaturverzeichnis befüllen. Erstelle Platzhalter-Referenzen im Format [Quelle nachtragen].

---

## Phase 5: Firmenidentifikation (Kapitel 2 → wird Kapitel 3)

Nur die Bereinigung aus Phase 1.6 (doppelter Satz). Inhaltlich ist das Kapitel okay.

---

## Phase 6: User Stories (Kapitel 3 → wird Kapitel 4)

Minimaler Feinschliff:

- Der Einleitungsabsatz enthält einen fehlenden Bindestrich: "die übergeordnete Zielsetzung , die Steigerung jugendlicher Partizipation" sollte sein: "die übergeordnete Zielsetzung – die Steigerung jugendlicher Partizipation –"
  - ACHTUNG: Verwendet in der gesamten Arbeit KEINE Gedankenstriche (–). Nutzt stattdessen Klammern oder Kommas. Also: "die übergeordnete Zielsetzung (die Steigerung jugendlicher Partizipation im öffentlichen Raum) in überprüfbare Systemanforderungen."

---

## Phase 7: MVP (Kapitel 4 → wird Kapitel 5)

### 7.1 Redundanzen streichen

Der Abschnitt "Ausgangslage" wiederholt fast wörtlich die Einleitung. Kürzen auf 2-3 Sätze, die nur den MVP-spezifischen Kontext liefern.

### 7.2 Inkonsistenz

- "Minimal Viable Product (MVP)" wird im Titel und Text verwendet. Da MVP bereits im Abkürzungsverzeichnis steht, reicht beim ersten Vorkommen eine Auflösung, danach nur noch "MVP".

---

## Phase 8: Prozessbeschreibung (Kapitel 5 → wird Kapitel 6)

### 8.1 Fehlende Grafik referenzieren

Der Text verweist auf eine "Übersichtsgrafik", die nicht vorhanden ist. Entweder:

- Eine Abbildungsreferenz als Platzhalter einfügen: "[Abbildung X: Übersicht Beteiligungsprozess]"
- Oder den Verweis entfernen

### 8.2 Leichte Kürzung möglich

Kapitel 5.2 (Information und Zugang) ist sehr ausführlich. Kann um ca. 30% gekürzt werden, ohne Inhalt zu verlieren.

---

## Phase 9: Kommunikationsstrategie (Kapitel 6 → wird Kapitel 7)

Dieses Kapitel ist zu oberflächlich. Jeder Unterabschnitt besteht aus nur einem Absatz. Folgende Vertiefungen ergänzen:

### 9.1 Kommunikationskanäle (6.3) vertiefen

Ergänze konkrete Beispiele:

- Welche Social-Media-Plattformen (Instagram, TikTok)?
- Welche Formate (Stories, Reels, Plakate)?
- Wo werden QR-Codes platziert (Schulhaus, Jugendtreff, Gemeindeblatt)?

### 9.2 Ansprache und Inhalte (6.4) vertiefen

Ergänze:

- Beispielhafte Formulierungen/Claims
- Tonalität (du-Form, jugendgerecht)
- Visueller Stil (Farben, Bildsprache)

### 9.3 Zeitplan ergänzen

Ergänze einen kurzen Kommunikations-Zeitplan:

- Vor der Beteiligungsphase: Bekanntmachung
- Während: Aktivierung und Erinnerung
- Nach: Ergebniskommunikation

---

## Phase 10: Token-Konzept (Kapitel 7 → wird Kapitel 8)

### 10.1 Risiken konkretisieren

Im Abschnitt "Risiken und Grenzen" (7.8) fehlen konkrete Szenarien. Ergänze:

- Was passiert, wenn ein QR-Code auf Social Media geteilt wird?
- Wie viele Stimmen könnte eine einzelne Person theoretisch abgeben (1 Token = 1 Stimme, aber Tokens könnten weitergegeben werden)?
- Welche Monitoring-Massnahmen existieren (z.B. ungewöhnliche Voting-Muster erkennen)?

### 10.2 Validierungsliste reparieren

In Abschnitt 7.5.3 ist die Aufzählung fehlerhaft formatiert:

```
- in der Datenbank existiert.
- aktiv ist,
- nicht gesperrt oder gelöscht wurde und
- dem aktuellen Nutzungskontext entspricht.
```

Der erste Punkt beginnt kleingeschrieben und hat einen Punkt statt Komma. Vereinheitlichen.

---

## Phase 11: Testkonzept (Kapitel 8 → wird Kapitel 9)

### 11.1 Begründung ergänzen

Im Abschnitt "Fazit und nächste Schritte" (8.4) steht nur, dass keine Tests durchgeführt wurden. Ergänze eine Begründung, z.B.:

- Zeitliche Einschränkungen im Projektzeitrahmen
- Fehlender Zugang zur Zielgruppe (Jugendliche) im Semesterkontext
- Bewusste Priorisierung der konzeptionellen und technischen Grundlagen

---

## Phase 12: Technische Dokumentation (Kapitel 9 → wird Kapitel 10)

### 12.1 NFR-Begründungen

In der Tabelle "Nicht-funktionale Anforderungen" (9.10.2):

- "< 58 s" für Baumgenerierung: Woher kommt dieser Wert? Ergänze eine Fussnote oder Erklärung (z.B. "basierend auf gemessenen GPT-4o-Antwortzeiten im Testbetrieb")
- Ergänze einen Hinweis, wie die 58s dem User kommuniziert werden (Loading-Animation, Progress-Indikator)

### 12.2 Architekturentscheide vertiefen

Die Begründungen in der Tabelle (9.11) sind zu dünn. Ergänze bei mindestens folgenden Einträgen:

- **Next.js:** Warum nicht SvelteKit trotz kleinerem Bundle? (z.B. grösseres Ökosystem, bessere Vercel-Integration)
- **Prisma:** Was bedeutet "Shared Types" konkret für die Zusammenarbeit?
- **Neon PostgreSQL:** Warum nicht Supabase, das mehr Features bietet?
- **Bildgenerierung:** "Erbringt die verlange Qualitätsansprüche" enthält einen Tippfehler ("verlange" → "verlangten") und ist keine echte Begründung. Was wurde evaluiert?

### 12.3 Sicherheitshinweise ergänzen

Ergänze im Abschnitt "Bekannte Limitierungen" (9.13):

- ADMIN_SECRET als Bearer-Token ist für MVP akzeptabel, für Produktion unzureichend (z.B. OAuth/OIDC nötig)
- Kein Rate Limiting auf API-Endpunkten implementiert
- Kein CSRF-Schutz explizit dokumentiert

---

## Phase 13: Fazit überarbeiten

### 13.1 Ich-Form korrigieren

Der Absatz "Persönlich hat mich dieses Projekt gelehrt..." wechselt von der Gruppenform in die Ich-Form. Bei einer Arbeit mit drei Autoren gibt es zwei Optionen:

- **Option A (empfohlen):** In Wir-Form umschreiben ("Persönlich hat uns dieses Projekt gelehrt...")
- **Option B:** Drei separate persönliche Statements (eines pro Autor)

### 13.2 Redundanzen streichen

Folgende Aussagen kommen im Fazit zum wiederholten Mal vor und können gekürzt oder gestrichen werden:

- "Jugendliche in kommunalen Planungsprozessen häufig unzureichend berücksichtigt werden" (steht schon in Summary, Einleitung, MVP)
- "niedrigschwellige, digitale Beteiligungsformate" (mehrfach)
- Die Aufzählung "von User Stories über ein datenschutzorientiertes Token-Konzept bis hin zur konkreten Systemarchitektur" wiederholt den Aufbau der Arbeit

### 13.3 Letzten Absatz straffen

"Abschliessend lässt sich festhalten..." ist sehr allgemein. Konkreter formulieren: Was genau ist der Beitrag dieser Arbeit?

---

## Phase 14: Durchgängige sprachliche Korrekturen

Diese Korrekturen betreffen das gesamte Dokument.

### 14.1 ss/ß vereinheitlichen

Die Arbeit entsteht in der Schweiz und muss durchgängig die ss-Schreibung verwenden. Ersetze alle ß durch ss:

- "Maßnahmen" → "Massnahmen"
- "schließen" → "schliessen"
- "Abschließend" → "Abschliessend"
- "großes" → "grosses"
- "äußern" → "äussern"
- Alle weiteren Vorkommen von ß systematisch ersetzen

### 14.2 Gendering vereinheitlichen

Aktuell wird gemischt: "Nutzer:innen", "Nutzerinnen und Nutzer", "Nutzer". Entscheidet euch für eine Form und zieht sie durch. Empfehlung: Doppelpunkt-Form (Nutzer:innen) durchgängig, da bereits mehrfach verwendet.

### 14.3 Keine Gedankenstriche

Im gesamten Dokument keine Gedankenstriche (–) verwenden. Stattdessen Klammern, Kommas oder Umformulierungen.

### 14.4 Passivkonstruktionen reduzieren

Wo möglich aktive Formulierungen verwenden:

- "Es werden keine Klardaten gespeichert" → "Das System speichert keine Klardaten"
- "wurde entwickelt" → "entstand" oder "das Team entwickelte"
- Nicht zwanghaft überall ändern, aber die Lesbarkeit verbessern

---

## Phase 15: Literaturverzeichnis

Das Literaturverzeichnis (Kapitel 10) ist komplett leer. Das ist ein schwerwiegender Mangel.

### 15.1 Platzhalter-Referenzen einfügen

Überall dort, wo im Text implizit auf Konzepte referenziert wird, Platzhalter einfügen:

- Design Thinking → [Quelle nachtragen]
- Golden Circle (Simon Sinek) → [Quelle nachtragen]
- Privacy by Design → [Quelle nachtragen]
- Partizipationsstufen → [Quelle nachtragen]
- Thinking Aloud (Usability-Methode) → [Quelle nachtragen]

### 15.2 Mindestanzahl Quellen

Für eine IKTS-Arbeit sollten mindestens 10-15 Quellen vorhanden sein. Die Autoren müssen diese selbst recherchieren und einfügen.

---

## Typst-spezifische Anforderungen

### Layout

- A4, Seitenränder 2.5 cm
- Schrift: Für den Fliesstext eine gut lesbare Schrift (z.B. "New Computer Modern" oder "Linux Libertine"), Überschriften ggf. serifenlos
- Zeilenabstand: 1.5
- Seitenzahlen ab der ersten Inhaltsseite
- Titelseite ohne Seitenzahl

### Struktur

- Titelseite (Titel, Untertitel "IKTS Projektarbeit FS26", Autoren, Datum)
- Inhaltsverzeichnis (automatisch generiert)
- Abkürzungsverzeichnis
- Begriffe und Definitionen
- Hauptkapitel 1-10 (mit neuer Nummerierung nach Einfügen von "Stand der Forschung")
- Literaturverzeichnis
- Erklärung zur Urheberschaft
- Anhang

### Tabellen

- Alle Tabellen aus dem Original übernehmen (User Stories, API-Endpunkte, NFRs, Architekturentscheide, Fehlerbehandlung, Umgebungsvariablen etc.)
- Tabellen nummerieren und beschriften

---

## Zusammenfassung der neuen Kapitelstruktur

| Nr. | Kapitel                     | Status                                  |
| --- | --------------------------- | --------------------------------------- |
| 1   | Einleitung                  | Überarbeiten (Aufbau ergänzen)          |
| 2   | Stand der Forschung         | **NEU**                                 |
| 3   | Firmenidentifikation        | Doppelten Satz entfernen                |
| 4   | User Stories                | Feinschliff                             |
| 5   | MVP                         | Redundanzen kürzen                      |
| 6   | Prozessbeschreibung         | Grafikverweis klären, leicht kürzen     |
| 7   | Kommunikationsstrategie     | Vertiefen                               |
| 8   | Token-Konzept               | Risiken ausbauen                        |
| 9   | Testkonzept                 | Begründung ergänzen                     |
| 10  | Technische Dokumentation    | NFRs, Architekturentscheide, Sicherheit |
| 11  | Fazit                       | Ich-Form, Redundanzen                   |
| -   | Literaturverzeichnis        | Platzhalter einfügen                    |
| -   | Erklärung zur Urheberschaft | Übernehmen                              |
| -   | Anhang                      | Platzhalter umbenennen                  |
