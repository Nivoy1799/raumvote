// RaumVote – IKTS Projektarbeit FS26
// Autoren: Felix Schiess, Jovin Risch, Luis Würgler

#set document(
  title: "RaumVote: Ein digitales Beteiligungsformat zur Förderung der Jugendpartizipation im öffentlichen Raum",
  author: ("Felix Schiess", "Jovin Risch", "Luis Würgler"),
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  numbering: none,
)

#set text(
  font: "New Computer Modern",
  size: 11pt,
  lang: "de",
)

#set par(
  leading: 0.85em,
  justify: true,
  spacing: 1.3em,
)

#set heading(numbering: "1.")

#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(0.5cm)
  text(size: 14pt, weight: "bold")[#it]
  v(0.3cm)
}

#show heading.where(level: 2): it => {
  v(0.3cm)
  text(size: 12pt, weight: "bold")[#it]
  v(0.2cm)
}

#show heading.where(level: 3): it => {
  v(0.2cm)
  text(size: 11pt, weight: "bold")[#it]
  v(0.1cm)
}

// ─────────────────────────────────────────
// TITELSEITE
// ─────────────────────────────────────────

#page(numbering: none)[
  #v(3cm)
  #align(center)[
    #text(size: 22pt, weight: "bold")[
      RaumVote: Ein digitales Beteiligungsformat zur Förderung der Jugendpartizipation im öffentlichen Raum
    ]

    #v(1.5cm)
    #text(size: 15pt)[IKTS Projektarbeit FS26]

    #v(3cm)
    #text(size: 13pt)[
      Felix Schiess, Jovin Risch, Luis Würgler
    ]

    #v(0.8cm)
    #text(size: 11pt)[St. Gallen, 11. April 2026]

    #v(1cm)
    #text(size: 11pt, style: "italic")[OST – Ostschweizer Fachhochschule]
  ]
]

// ─────────────────────────────────────────
// MANAGEMENT SUMMARY
// ─────────────────────────────────────────

#set page(numbering: none)

#heading(numbering: none, level: 1)[Management Summary]

Jugendliche sind zentrale Nutzergruppen öffentlicher Räume und doch finden ihre Perspektiven in kommunalen Planungsprozessen häufig nur unzureichend Gehör. Klassische Beteiligungsformate entsprechen oft nicht ihrer Lebensrealität und werden kaum genutzt.

Im Rahmen dieser Projektarbeit wurde mit _RaumVote_ ein prototypisches, digitales Beteiligungstool konzipiert und umgesetzt. Die Plattform bietet Jugendlichen einen niederschwelligen, mobilen und datenschutzkonformen Zugang zur Mitbestimmung.

Das System basiert auf einem Mobile-First-Ansatz mit gamifizierten, binären Entscheidungsbäumen. Die Teilnahme erfolgt via QR-Code-basierter Tokens ohne Registrierung. Nutzer:innen können durch Abstimmen, Liken und Kommentieren ihre Meinungen einbringen. Das Privacy-by-Design-Prinzip stellt sicher, dass keine personenbezogenen Klardaten gespeichert werden.

Als Ergebnis der Arbeit liegt ein funktionaler MVP vor, ergänzt durch ein Token-Konzept, eine Kommunikationsstrategie und ein Testkonzept. Die technische Umsetzung basiert auf modernen Architekturprinzipien (API-zentriert, Mobile First, Privacy-by-Design) und integriert KI-gestützte Inhaltsgenerierung.

RaumVote zeigt, dass digitale Beteiligungsformate das Potenzial besitzen, die Partizipation von Jugendlichen nachhaltig zu stärken. Der entwickelte Prototyp bildet eine fundierte Grundlage für Weiterentwicklungen und den Einsatz in realen Gemeindeprojekten.

// ─────────────────────────────────────────
// INHALTSVERZEICHNIS
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Inhaltsverzeichnis]

#outline(
  title: none,
  indent: 1.5em,
)

// ─────────────────────────────────────────
// ABKÜRZUNGSVERZEICHNIS
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Abkürzungsverzeichnis]

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Abkürzung*], [*Bedeutung*],
  [API], [Application Programming Interface],
  [DSGVO], [Datenschutz-Grundverordnung],
  [JWT], [JSON Web Token],
  [KI], [Künstliche Intelligenz],
  [MVP], [Minimal Viable Product],
  [ORM], [Object-Relational Mapping],
  [PWA], [Progressive Web App],
  [QR], [Quick Response],
  [SHA], [Secure Hash Algorithm],
  [UI], [User Interface],
  [UUID], [Universally Unique Identifier],
  [UX], [User Experience],
)

// ─────────────────────────────────────────
// BEGRIFFE UND DEFINITIONEN
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Begriffe und Definitionen]

#table(
  columns: (3.5cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Begriff*], [*Definition*],
  [Episode], [Vollständiger Pfad vom Wurzelknoten zum aktuellen Knoten. Wird als Kontext an GPT-4o übergeben.],
  [Discovery], [Feature: Erster Besucher eines Knotens wird als Entdecker erfasst. Steuerbar via discoveryEnabled-Flag.],
  [voterHash], [SHA-256-Hash aus \{VOTER_PEPPER\}:\{voterId\}. Pseudonymisierte Nutzerkennung in allen Fachdaten.],
  [ActionRail], [Vertikale UI-Komponente mit runden Buttons für Like, Vote, Comment, Share (TikTok-Stil).],
  [Toggle/Upsert], [Abstimmungsmuster: Erneutes Voten auf dieselbe Option löscht die Stimme, auf eine andere ändert sie.],
  [SKIP LOCKED], [PostgreSQL-Mechanismus für nebenläufige Job-Verarbeitung. Gesperrte Zeilen werden übersprungen.],
  [Vor-Generierung], [Proaktive Generierung von Enkel-Knoten im Hintergrund zur Latenz-Reduktion.],
  [Fire-and-Forget], [Asynchroner Aufruf nach API-Antwort (Inline-Bildverarbeitung auf Vercel).],
  [VOTER_PEPPER], [Serverseitiger geheimer Wert, kombiniert mit voterId vor SHA-256-Hashing.],
  [Session-Lebenszyklus], [draft → active → archived. Steuert Schreib-/Leserechte.],
)

// ─────────────────────────────────────────
// SEITENNUMMERIERUNG AB HIER
// ─────────────────────────────────────────

#set page(numbering: "1")
#counter(page).update(1)

// ─────────────────────────────────────────
// KAPITEL 1: EINLEITUNG
// ─────────────────────────────────────────

= Einleitung

An einem Freitagabend treffen sich Jugendliche auf dem Dorfplatz. Sie sitzen auf Bänken, hören Musik, tauschen sich aus und verbringen gemeinsam Zeit. Für sie ist dieser Ort ein zentraler sozialer Treffpunkt. Gleichzeitig entstehen genau hier Spannungen: Anwohnende fühlen sich durch Lärm gestört, andere Nutzergruppen empfinden Unsicherheit und die Gemeinde ergreift Massnahmen, um die Situation zu regulieren. Häufig geschieht dies jedoch ohne die direkte Einbindung der Jugendlichen.

Dieses Spannungsfeld macht ein grundlegendes Problem sichtbar: Zwar sind Jugendliche intensiv von der Gestaltung öffentlicher Räume betroffen, doch finden ihre Perspektiven in Planungs- und Entscheidungsprozessen oft nur begrenzt Gehör. Insbesondere Jugendliche ohne institutionelle Anbindung, etwa an Vereine oder politische Strukturen, bleiben vielfach unsichtbar. Gleichzeitig entsprechen klassische Beteiligungsformate häufig nicht ihrer Lebensrealität und werden daher kaum genutzt.

Demgegenüber steht eine Generation, die mit digitalen Technologien aufgewachsen ist. Für viele Jugendliche ist es selbstverständlich, über mobile Anwendungen und digitale Plattformen zu kommunizieren, ihre Meinung zu äussern und zu interagieren. Daraus ergibt sich die Chance, Beteiligung neu zu denken: niederschwelliger, intuitiver und näher an der Lebenswelt der Zielgruppe.

Vor diesem Hintergrund setzt die vorliegende Arbeit an. Ziel ist es, einen Ansatz zu entwickeln, der es Jugendlichen ermöglicht, ihre Bedürfnisse und Ideen aktiv in die Gestaltung öffentlicher Räume einzubringen. Im Zentrum steht dabei das Projekt „RaumVote", eine digitale, mobile Beteiligungsplattform, die bewusst einfach, anonym und interaktiv gestaltet ist.

In dieser Arbeit werden sozialräumliche Fragestellungen mit technologischen Lösungsansätzen verbunden. Zunächst werden auf Basis eines Design-Thinking-Prozesses#super[1] Problemstellung und Bedürfnisse analysiert, bevor konkrete Konzepte entwickelt und in Form eines Prototyps umgesetzt werden.

Die zentrale Leitfrage lautet: „Wie kann ein digitales Beteiligungsformat gestaltet werden, das Jugendliche tatsächlich erreicht, zur Mitwirkung motiviert und gleichzeitig Ergebnisse liefert, die für kommunale Planungsprozesse nutzbar sind?"

Die Arbeit gliedert sich wie folgt: Zunächst wird der Stand der Forschung zu Partizipation und bestehenden digitalen Tools vorgestellt (Kapitel 2). Anschliessend wird die Firmenidentität von RaumVote beschrieben (Kapitel 3). Die funktionalen Anforderungen werden in Form von User Stories formuliert (Kapitel 4) und der MVP definiert (Kapitel 5). Der Beteiligungsprozess wird in Kapitel 6 beschrieben, die Kommunikationsstrategie in Kapitel 7 und das Token-Konzept in Kapitel 8. Kapitel 9 dokumentiert das Testkonzept. Die technische Dokumentation in Kapitel 10 beschreibt Architektur, Implementierung und Betrieb des Systems. Das Fazit in Kapitel 11 reflektiert die Ergebnisse und das Lernpotenzial der Arbeit.

// ─────────────────────────────────────────
// KAPITEL 2: STAND DER FORSCHUNG (NEU)
// ─────────────────────────────────────────

= Stand der Forschung und bestehende Ansätze

== Partizipationsforschung

Partizipation bezeichnet die aktive Beteiligung von Bürger:innen an politischen, sozialen oder räumlichen Entscheidungsprozessen. In der Literatur werden verschiedene Stufen der Partizipation unterschieden: von der blossen Information über die Konsultation bis hin zur echten Mitentscheidung#super[4]. Diese Stufenmodelle verdeutlichen, dass nicht jede Form der Beteiligung gleichwertig ist. Echte Partizipation setzt voraus, dass die Beiträge der Teilnehmenden tatsächlich in Entscheidungen einfliessen.

Im Kontext der Jugendpartizipation kommt der Zugang zu geeigneten Formaten besondere Bedeutung zu. Jugendliche sind häufig von der Gestaltung öffentlicher Räume unmittelbar betroffen, verfügen jedoch selten über institutionelle Kanäle zur Einflussnahme. Klassische Beteiligungsformate wie öffentliche Versammlungen oder schriftliche Vernehmlassungen entsprechen häufig nicht ihrer Lebensrealität.

Auf internationaler Ebene verankert Artikel 12 der UN-Kinderrechtskonvention das Recht von Kindern und Jugendlichen, in allen sie betreffenden Angelegenheiten gehört zu werden#super[6]. Dieser rechtliche Rahmen unterstreicht die Notwendigkeit, niederschwellige und altersgerechte Beteiligungsformate zu entwickeln.

== Bestehende digitale Beteiligungstools

In den letzten Jahren sind verschiedene digitale Beteiligungsplattformen entstanden, die den Partizipationsprozess unterstützen sollen.

*Decidim* (Barcelona) ist eine Open-Source-Plattform für demokratische Beteiligung, die von zahlreichen Städten und Organisationen weltweit eingesetzt wird. Sie bietet Funktionen für Abstimmungen, Kommentare und deliberative Prozesse, richtet sich jedoch primär an erwachsene Zielgruppen und erfordert eine vollständige Registrierung#super[7].

*Consul* (Madrid) verfolgt einen ähnlichen Ansatz und ermöglicht Bürger:innen die direkte Mitgestaltung kommunaler Entscheidungen. Auch hier liegt der Fokus auf einer erwachsenen Nutzerschaft mit entsprechend komplexem Funktionsumfang#super[8].

Im deutschsprachigen Raum sind Plattformen wie *meinBerlin* oder *Beteiligung.NRW* bekannt, die digitale Bürgerbeteiligung auf Landes- und kommunaler Ebene ermöglichen. Diese Angebote sind jedoch in der Regel formell ausgerichtet und setzen Medienkompetenz sowie eine gewisse Vertrautheit mit politischen Prozessen voraus.

Gemeinsam ist diesen Tools, dass sie für erwachsene Zielgruppen konzipiert sind, eine Registrierung erfordern und kaum gamifizierte oder mobile Nutzungsmuster berücksichtigen. Damit adressieren sie eine grundlegende Forschungslücke nicht: Es fehlen jugendspezifische, anonyme, gamifizierte Beteiligungsformate, die konsequent auf Mobile-First ausgerichtet sind#super[11].

== Positionierung von RaumVote

RaumVote positioniert sich als Antwort auf diese Forschungslücke. Im Unterschied zu bestehenden Plattformen verfolgt RaumVote folgende Alleinstellungsmerkmale:

- *Anonym:* Keine Registrierung, keine Klardaten, QR-Code-basierter Zugang
- *Gamifiziert:* Binäre Entscheidungsbäume mit Wisch-Navigation nach TikTok-Vorbild
- *Mobile-First:* Konsequent für Smartphone-Nutzung optimiert
- *Privacy-by-Design:* Pseudonymisierung via SHA-256 und VOTER_PEPPER von Grund auf integriert
- *Anschlussfähig:* Ergebnisse sind für kommunale Planungsprozesse aufbereitet

Damit schliesst RaumVote eine Lücke zwischen hochschwelligen, formal ausgerichteten Beteiligungstools und der digitalen Lebenswelt von Jugendlichen.

// ─────────────────────────────────────────
// KAPITEL 3: FIRMENIDENTIFIKATION
// ─────────────────────────────────────────

= Firmenidentifikation

Im Rahmen der Entwicklung des Projekts „RaumVote" wurde eine eigenständige Firmenidentität erarbeitet, die die inhaltliche Zielsetzung sowie die Zielgruppe des Projekts widerspiegelt. Grundlage hierfür war der Design-Thinking-Ansatz#super[1], insbesondere die Auseinandersetzung mit dem „Why" im Sinne des Golden Circle nach Simon Sinek#super[2].

== Markenidee und Botschaft

Ausgangspunkt der Markenentwicklung war die zentrale Problemstellung, dass die Bedürfnisse von Jugendlichen im öffentlichen Raum häufig nicht ausreichend berücksichtigt werden, da sie in kommunalen Planungsprozessen oft nicht ausreichend gehört werden. Daraus entstand die Leitidee, Jugendlichen eine niederschwellige, digitale Möglichkeit zur Mitbestimmung zu bieten.

Die zentrale Botschaft von RaumVote lautet:

#align(center)[
  _„Deine Stimme für deinen Raum."_
]

Diese Botschaft bringt den Kern des Projekts prägnant auf den Punkt: Jugendliche sollen aktiv Einfluss auf die Gestaltung ihres Lebensumfelds nehmen können.

== Namensgebung

Der Name „RaumVote" setzt sich aus zwei zentralen Begriffen zusammen: „Raum" steht für den öffentlichen Raum als Ort sozialer Interaktion und Nutzungskonflikte, „Vote" für Mitbestimmung, Beteiligung und demokratische Entscheidungsprozesse.

Durch die Kombination beider Begriffe entsteht ein prägnanter, moderner Name, der den thematischen Fokus sowie die Funktion der Plattform widerspiegelt.

== Logo-Konzept

Das entwickelte Logo kombiniert zwei zentrale Symbole:

- Standort-Pin (Location Marker): symbolisiert den physischen Raum bzw. den konkreten Ort in der Gemeinde,
- Wahlurne mit Häkchen: steht für Beteiligung, Abstimmung und Mitentscheidung.

Durch die Verschmelzung dieser beiden Elemente entsteht ein visuelles Zeichen für digitale Partizipation im öffentlichen Raum. Somit transportiert das Logo die Kernidee des Projekts: die Verbindung von Ort und Mitbestimmung.

// ─────────────────────────────────────────
// KAPITEL 4: USER STORIES
// ─────────────────────────────────────────

= User Stories

Zur Ableitung der funktionalen Anforderungen des digitalen Beteiligungstools _RaumVote_ wurden zentrale Nutzungsszenarien in Form von User Stories formuliert. Die Stories orientieren sich an den identifizierten Anspruchsgruppen des Cases (Jugendliche, Jugendarbeit, Gemeinde) sowie an den definierten Rahmenbedingungen hinsichtlich Barrierefreiheit, Datenschutz und Anschlussfähigkeit an kommunale Planungsprozesse.

Die User Stories konkretisieren das konzeptionelle Beteiligungsformat und übersetzen die übergeordnete Zielsetzung (die Steigerung jugendlicher Partizipation im öffentlichen Raum) in überprüfbare Systemanforderungen.

== US-01: Sicherstellung eines respektvollen digitalen Beteiligungsraums

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*User Story*], [Als Jugendarbeiter:in möchte ich sicherstellen, dass die Plattform vor Spam und missbräuchlicher Nutzung geschützt ist, damit eine konstruktive und wertschätzende Beteiligung gewährleistet werden kann.],
  [*Beschreibung*], [Da das Beteiligungstool eine anonyme Nutzung ermöglicht, besteht potenziell das Risiko von Mehrfachabstimmungen, Spam-Kommentaren oder unangemessenen Inhalten. Zur Sicherung der Qualität des digitalen Diskurses sind daher technische und organisatorische Schutzmechanismen erforderlich.],
  [*Akzeptanz­kriterien*], [
    - Pro Beteiligungsrunde ist nur eine gültige Stimme pro Nutzer:in möglich.
    - Mehrfach-Likes oder Mehrfach-Votes werden systemseitig verhindert.
    - Kommentare werden pseudonymisiert gespeichert.
    - Die Jugendarbeit verfügt über Moderationsrechte (z.B. Löschung von Kommentaren).
    - Zugangstokens können deaktiviert oder entzogen werden.
  ],
)

== US-02: Ermöglichung eines digitalen Austauschs

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*User Story*], [Als Jugendliche:r möchte ich Ideen kommentieren und Beiträge anderer liken können, damit ich meine Perspektive einbringen und mich aktiv am Diskurs beteiligen kann.],
  [*Beschreibung*], [Neben der reinen Abstimmungsfunktion soll das Beteiligungsangebot dialogische Beteiligungsformen ermöglichen. Jugendliche sollen ihre Ideen erläutern, Rückmeldungen geben und auf Beiträge anderer reagieren können.],
  [*Akzeptanz­kriterien*], [
    - Kommentare können erstellt und angezeigt werden.
    - Kommentare können von anderen Nutzer:innen geliked werden.
    - Die Anzahl der Kommentare wird pro Idee transparent dargestellt.
    - Kommentare werden in einem strukturierten Interaktionsbereich angezeigt.
    - Es besteht keine Klarnamenpflicht.
  ],
)

== US-03: Niederschwelliger und mobiler Zugang zur Beteiligung

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*User Story*], [Als 14-jährige:r Schüler:in möchte ich einfach und mobil an einer Abstimmung teilnehmen können, damit ich ohne hohen Aufwand meine Meinung einbringen kann.],
  [*Beschreibung*], [Die Zielgruppe weist eine hohe Affinität zu mobilen digitalen Anwendungen auf. Das Beteiligungstool muss daher intuitiv, barrierearm und zeitlich flexibel nutzbar sein.],
  [*Akzeptanz­kriterien*], [
    - Das Interface ist mobile-first gestaltet.
    - Navigation erfolgt intuitiv per Swipe- oder Tap-Funktion.
    - Der Zugang erfolgt über QR-Code ohne klassische Registrierung.
    - Die Nutzung ist zeit- und ortsunabhängig möglich.
    - Es sind keine komplexen Formulare erforderlich.
  ],
)

== US-04: Nutzbarmachung der Beteiligungsergebnisse für Planungsprozesse

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*User Story*], [Als Vertreter:in der Gemeinde möchte ich aggregierte Beteiligungsergebnisse einsehen können, damit diese in das Nutzungs- und Gestaltungskonzept einfliessen können.],
  [*Beschreibung*], [Die digitalen Beteiligungsergebnisse müssen für formelle kommunale Planungsprozesse anschlussfähig sein. Hierfür ist eine transparente und strukturierte Darstellung der Abstimmungsergebnisse erforderlich.],
  [*Akzeptanz­kriterien*], [
    - Ergebnisse werden als übersichtliche Rangliste dargestellt.
    - Die Anzahl der Stimmen pro Idee ist ersichtlich.
    - Ergebnisse sind sessionspezifisch abrufbar.
    - Archivierte Beteiligungsrunden bleiben dokumentiert und einsehbar.
  ],
)

== US-05: Breite und barrierearme Erreichbarkeit der Zielgruppe

#table(
  columns: (3cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*User Story*], [Als Jugendarbeit möchte ich möglichst viele Jugendliche erreichen, damit auch nicht organisierte junge Menschen partizipieren können.],
  [*Beschreibung*], [Das Beteiligungsangebot soll niederschwellig und breit kommuniziert werden, um insbesondere Jugendliche ohne Vereins- oder politische Anbindung einzubeziehen.],
  [*Akzeptanz­kriterien*], [
    - Zugang ist via QR-Code (z.B. Gemeinde-Blatt oder Social Media) möglich.
    - Es besteht keine Registrierungspflicht.
    - Anonyme Nutzung ist gewährleistet.
    - Die Benutzeroberfläche ist verständlich formuliert.
    - Teilnahme ist ohne Vorwissen möglich.
  ],
)

// ─────────────────────────────────────────
// KAPITEL 5: MVP
// ─────────────────────────────────────────

= MVP

== Ausgangslage

RaumVote adressiert die Herausforderung, dass Jugendliche in kommunalen Planungsprozessen systematisch unterrepräsentiert sind, obwohl sie öffentliche Räume intensiv nutzen. Ein digital unterstütztes, gamifiziertes Beteiligungsformat erscheint als geeigneter Ansatz, um diese Lücke zu schliessen.

== Ziel des MVP

Ziel des MVP (Minimal Viable Product) ist es, ein niederschwelliges, zeit- und ortsunabhängiges sowie datenschutzkonformes Beteiligungsangebot bereitzustellen, mit dem Jugendliche ihre Bedürfnisse, Meinungen und Ideen zur Nutzung öffentlicher Räume einbringen können. Die Ergebnisse sollen so aufbereitet werden, dass sie für Jugendarbeit, Verwaltung und Planung im weiteren Entwicklungsprozess nutzbar und anschlussfähig sind.

Der MVP von RaumVote basiert auf einer Mobile-First-Voting-App mit interaktiven, binären Entscheidungsbäumen. Nutzer:innen bewegen sich durch einfache Auswahlentscheidungen und eine swipe-orientierte Navigation durch den Beteiligungsprozess und gelangen zu konkreten Optionen, die sie bewerten, liken oder kommentieren können. Dadurch wird die Beteiligung spielerisch, verständlich und an die Mediennutzung Jugendlicher angepasst.

== Funktionsweise des MVP

Zum Funktionsumfang des MVP gehören insbesondere der tokenbasierte Zugang via QR-Code, die pseudonymisierte Teilnahme, Voting-, Like- und Kommentarfunktionen sowie eine aggregierte Ergebnisdarstellung. Das System folgt einem Privacy-First-Ansatz: Das System speichert keine Klardaten der Jugendlichen, sondern verarbeitet lediglich gehashte Identitäten.

== Abgrenzung zum Endprodukt

Der MVP ist bewusst auf die Kernfunktion der digitalen Beteiligung reduziert. Er dient dazu, die zentrale Annahme zu überprüfen, ob Jugendliche durch ein digitales, gamifiziertes und barrierearmes Format tatsächlich besser erreicht werden und ob die daraus entstehenden Ergebnisse einen Mehrwert für kommunale Planungsprozesse liefern. Erweiterte Funktionen eines späteren Produkts stehen im MVP noch nicht im Vordergrund.

// ─────────────────────────────────────────
// KAPITEL 6: PROZESSBESCHREIBUNG
// ─────────────────────────────────────────

= Prozessbeschreibung

Zur Veranschaulichung des Ablaufs wird der Beteiligungsprozess nachfolgend beschrieben. Er umfasst die zentralen Prozessschritte von der Festlegung der Rahmenbedingungen über die Information und Beteiligung der Bevölkerung bis hin zur Auswertung, Planung und Umsetzung.

#align(center)[
  _[Abbildung 1: Übersicht Beteiligungsprozess – Grafik im Anhang]_
]

== Ausgangslage und Start des Prozesses

Der vorliegende Prozess bezieht sich auf die Gestaltung des Dorfplatzes. Ausgangspunkt sind Nutzungskonflikte im öffentlichen Raum sowie das Ziel, den Dorfplatz langfristig attraktiv und nutzbar für verschiedene Anspruchsgruppen zu gestalten. Ein besonderer Fokus liegt dabei auf der Beteiligung von Jugendlichen, da ihre Perspektiven in formellen Planungsprozessen häufig zu wenig sichtbar werden.

Der Prozess startet beim Gemeinderat. Zu Beginn werden die grundlegenden Rahmenbedingungen festgelegt: Projektumfang, Budgetrahmen, Zeitplan sowie die Regeln der Beteiligung.

Input des Prozesses sind die bestehende Ausgangslage am Dorfplatz, der Auftrag zur Neugestaltung, die festgelegten Rahmenbedingungen sowie die Rückmeldungen und Ideen aus der Bevölkerung. Output sind fachlich geprüfte Beteiligungsergebnisse, die in konkrete Planungsvarianten überführt werden.

== Information und Zugang zur Beteiligung

Nachdem die Rahmenbedingungen festgelegt wurden, wird die Bevölkerung über das Vorhaben informiert. Die Kommunikation erfolgt über Brief, digitale Kanäle und das Gemeindeblatt. Die Informationen machen transparent, worum es beim Projekt geht, welche Mitwirkungsmöglichkeiten bestehen und welche Themen beeinflusst werden können.

Der Zugang zur Beteiligung erfolgt niederschwellig über einen QR-Code, der direkt zur digitalen Beteiligungsplattform führt. Der QR-Code verbindet damit die analoge Information mit der digitalen Mitwirkung. Gleichzeitig besteht für Personen ohne digitale Affinität die Möglichkeit, über einen Infoscreen im Gemeindehaus teilzunehmen.

== Einbindung und Aktivierung der Jugendlichen

Ein zentraler Bestandteil des Prozesses ist die gezielte Einbindung von Jugendlichen. Diese werden nicht nur über allgemeine Informationskanäle angesprochen, sondern aktiv durch die Jugendarbeit erreicht. Die Jugendarbeit übernimmt dabei eine vermittelnde Rolle und geht gezielt in jugendnahe Kontexte, insbesondere in die Schule.

Ergänzend kann die Jugendarbeit die Beteiligung über weitere Kanäle wie Jugendtreffs, soziale Medien oder bestehende Angebote der offenen Kinder- und Jugendarbeit bewerben. Jugendliche können ihre Ideen und Wünsche digital einbringen, Beiträge anderer kommentieren und Rückmeldungen in Form von Likes abgeben.

Die Jugendarbeit übernimmt eine Übersetzungs- und Vermittlungsfunktion zwischen jugendlichen Perspektiven und dem formellen Planungsprozess.

== Auswertung der Beiträge und Überführung in die Planung

Nach Abschluss der Beteiligungsphase werden die eingegangenen Beiträge gesammelt, geordnet und ausgewertet. Ähnliche Rückmeldungen werden thematisch gebündelt, sodass aus den Einzelbeiträgen ein strukturierter Überblick über Bedürfnisse, Nutzungskonflikte und Gestaltungsideen entsteht.

Im nächsten Schritt werden die Ergebnisse durch Fachpersonen geprüft und in den Planungsprozess überführt. Diese beurteilen, welche Vorschläge räumlich, technisch, rechtlich und finanziell umsetzbar sind.

== Veröffentlichung, Entscheid und Umsetzung

Nach der fachlichen Ausarbeitung werden die Ergebnisse und möglichen Varianten wieder an die Öffentlichkeit zurückgespielt. Über das Gemeindeblatt, die Website der Gemeinde und Informationsveranstaltungen wird kommuniziert, welche Rückmeldungen aufgenommen wurden.

Anschliessend folgt der formelle Entscheid über die erarbeiteten Varianten. Die endgültige Entscheidung liegt in den vorgesehenen kommunalen Entscheidungsstrukturen. Nach dem Entscheid wird die gewählte Variante umgesetzt.

// ─────────────────────────────────────────
// KAPITEL 7: KOMMUNIKATIONSSTRATEGIE
// ─────────────────────────────────────────

= Kommunikationsstrategie

== Zielsetzung

Die Kommunikationsstrategie von RaumVote verfolgt das Ziel, Jugendliche auf das digitale Beteiligungsangebot aufmerksam zu machen, sie zur aktiven Teilnahme zu motivieren und die Ergebnisse für Jugendarbeit, Verwaltung und Planung nutzbar zu machen. Sie ist damit ein wichtiger Bestandteil des gesamten Beteiligungsprozesses.

== Zielgruppen

Im Mittelpunkt stehen Jugendliche als Hauptzielgruppe (ca. 12 bis 20 Jahre). Darüber hinaus richtet sich die Kommunikation auch an die Kinder- und Jugendarbeit sowie an die Gemeindeverwaltung, da diese den Prozess begleiten und die Ergebnisse weiterverarbeiten.

== Kommunikationskanäle

Für die Ansprache der Jugendlichen eignen sich insbesondere folgende Kanäle:

*Social Media:* Instagram und TikTok sind die relevantesten Plattformen für die Zielgruppe. Geeignete Formate sind kurze Reels und Stories, die den QR-Code und eine klare Handlungsaufforderung enthalten. Inhalte sollen kurz, visuell ansprechend und authentisch sein. Serien wie „Dein Platz. Deine Stimme." können die Beteiligung über mehrere Wochen begleiten.

*QR-Codes im physischen Raum:* QR-Codes werden gezielt an Orten platziert, die von Jugendlichen frequentiert werden: Schulhauseingänge, Schwarze Bretter, Jugendtreffs, öffentliche Anschlagstellen sowie im Gemeindeblatt. Die Kombination von analoger Platzierung und digitalem Zugang senkt die Hemmschwelle zur Teilnahme.

*Direktansprache durch Jugendarbeit:* Schulbesuche, Auftritte an Jugendtreffs und persönliche Einladungen durch Jugendarbeiter:innen sind besonders wirksam, da sie Vertrauen schaffen und Jugendliche direkt in ihrem Alltag abholen.

== Ansprache und Inhalte

Die Kommunikation orientiert sich an der Sprache und Lebenswelt der Zielgruppe:

*Tonalität:* Du-Form, jugendgerecht, direkt und positiv. Keine Behördensprache. Beispielhafte Claims:
- _„Sag uns, was du willst. Jetzt abstimmen."_
- _„Dein Dorfplatz. Deine Stimme. 2 Minuten."_
- _„Scan. Stimm ab. Fertig."_

*Visueller Stil:* Klare, kontrastreiche Gestaltung, die die RaumVote-Brandfarben aufgreift. Bildsprache mit echten Jugendlichen aus dem lokalen Umfeld ist wirkungsvoller als Stock-Fotos. Kurze animierte Clips erklären den Ablauf in unter 30 Sekunden.

*Inhaltlicher Fokus:* Die Kommunikation betont den unmittelbaren Nutzen für Jugendliche. Es geht nicht um abstrakte Partizipation, sondern um konkrete Verbesserungen an Orten, die sie täglich nutzen.

== Datenschutz und Vertrauen

Ein zentraler Bestandteil der Kommunikationsstrategie ist der Aufbau von Vertrauen. Datenschutz, Pseudonymisierung und die geschützte Teilnahme werden transparent und verständlich kommuniziert. Konkrete Aussagen wie „Keine Anmeldung. Keine Daten. Nur deine Meinung." helfen, Hemmschwellen abzubauen.

== Kommunikations-Zeitplan

Die Kommunikation gliedert sich in drei Phasen:

*Vor der Beteiligungsphase (2 Wochen davor):* Bekanntmachung des Projekts via Gemeindeblatt, Social-Media-Posts und Schulbesuche. QR-Codes werden an relevanten Standorten platziert. Ziel: Aufmerksamkeit und Neugier wecken.

*Während der Beteiligungsphase:* Regelmässige Erinnerungen auf Social Media (z.B. wöchentliche Story-Updates). Jugendarbeit reaktiviert bei zu geringer Beteiligung über Direktansprache. Zwischenstand-Posts motivieren zur Teilnahme ("Bisher haben X Jugendliche abgestimmt").

*Nach der Beteiligungsphase:* Ergebniskommunikation: Was wurde abgestimmt? Was passiert nun damit? Transparenz über den weiteren Planungsprozess schafft Vertrauen für zukünftige Beteiligungsrunden.

== Beitrag zum Beteiligungsprozess

Die Kommunikation begleitet den gesamten Beteiligungsprozess und ist mehr als ein Werbemittel. Sie unterstützt die Aktivierung der Jugendlichen, erleichtert die Nutzung des Tools und trägt dazu bei, dass die Ergebnisse in den kommunalen Planungsprozess einfliessen können.

// ─────────────────────────────────────────
// KAPITEL 8: TOKEN-KONZEPT
// ─────────────────────────────────────────

= Token-Konzept

== Zielsetzung des Token-Konzepts

Mithilfe des Token-Konzepts kann der Zugang zum digitalen Beteiligungstool RaumVote kontrolliert, niederschwellig und datenschutzorientiert gestaltet werden. Das Ziel besteht darin, ausschliesslich berechtigten Jugendlichen die Teilnahme am Beteiligungsprozess zu ermöglichen, ohne dabei auf klassische personenbezogene Registrierungssysteme wie E-Mail-Adresse, Telefonnummer oder Klarnamen zurückzugreifen. Damit wird dem Anspruch Rechnung getragen, ein möglichst barrierearmes, anonym nutzbares und zugleich missbrauchsresistentes Beteiligungsangebot bereitzustellen.

== Grundidee

Das Zugangssystem basiert auf im Voraus generierten und eindeutig zugewiesenen Zugriffstokens. Diese Tokens werden durch die Administration erstellt und anschliessend in Form von QR-Codes an die Zielgruppe verteilt. Beim Scannen eines solchen Codes gelangt die Nutzerin bzw. der Nutzer auf eine Login-Seite, auf der das Token geprüft und lokal auf dem Endgerät gespeichert wird. Danach kann die Person ohne erneute Anmeldung auf die Plattform zugreifen.

== Anforderungen an das Token-System

Das Token-System muss mehrere funktionale und nicht-funktionale Anforderungen erfüllen:

1. Erstens soll es Jugendlichen den Zugang möglichst einfach gestalten. Die Nutzung eines QR-Codes ist hierfür sinnvoll, da sie dem mobilen Medienverhalten der Zielgruppe entspricht.
2. Zweitens soll das System datensparsam sein. Das System darf möglichst keine direkt personenbezogenen Daten verarbeiten oder dauerhaft speichern.
3. Drittens muss das System eine gewisse Zugangskontrolle gewährleisten, damit nicht beliebige Dritte am Beteiligungsprozess teilnehmen können.
4. Viertens muss es technisch anschlussfähig für die bestehende Systemarchitektur sein.

== Aufbau des Tokens

Ein Token wird als UUID erzeugt. Diese bietet eine ausreichend hohe Entropie, um zufällige und schwer erratbare Zugänge zu erzeugen. Ein Token umfasst konzeptionell folgende Eigenschaften:

- eindeutige Identifikation,
- hohe Zufälligkeit,
- keine semantische Information über die Person,
- maschinenlesbare Repräsentation als QR-Code,
- Zuordnung zu einem aktiven Beteiligungsprozess.

Das Token selbst enthält keine personenbezogenen Metadaten. Es ist als pseudonymer Zugangsschlüssel zu verstehen.

== Lebenszyklus eines Tokens

=== Erstellung

Die Tokens werden durch die Administration im Backend generiert. Für jede teilnahmeberechtigte Person wird ein eigener Token erstellt.

=== Distribution

Nach der Erstellung werden die Tokens in Form von QR-Codes verteilt. Die Ausgabe kann über Jugendarbeit, Schule, Jugendtreff, Gemeindeveranstaltungen oder begleitende Offline-Kommunikationsmittel erfolgen. Der QR-Code verweist direkt auf eine Login-URL in der Form `/login/[token]`.

=== Validierung

Beim ersten Zugriff prüft das System serverseitig, ob das übermittelte Token:

- in der Datenbank existiert,
- aktiv ist,
- nicht gesperrt oder gelöscht wurde und
- dem aktuellen Nutzungskontext entspricht.

Nur bei erfolgreicher Prüfung wird der Zugang gewährt.

=== Lokale Speicherung

Nach erfolgreicher Validierung wird das Token im `localStorage` des Browsers auf dem Endgerät gespeichert. Dadurch bleibt der Zugang über mehrere Sitzungen hinweg erhalten, ohne dass eine erneute Eingabe nötig wird.

=== Deaktivierung oder Widerruf

Ein Token kann administrativ deaktiviert, gelöscht oder ausgetauscht werden. Dank der serverseitigen Validierung kann ein zuvor verteilter Token nachträglich für ungültig erklärt werden.

== Datenschutz- und Sicherheitslogik

Ein zentrales Element des Konzepts besteht darin, dass der rohe Token nicht als Identifikator in fachlichen Nutzungsdaten gespeichert wird. Stattdessen wird für Datenbankoperationen ein Hashwert des Tokens verwendet. Dazu wird das Token mit einem geheimen serverseitigen Wert (VOTER_PEPPER) kombiniert und anschliessend mittels SHA-256 gehasht#super[10]. Dieser Hash dient als pseudonymisierte Nutzerkennung in Votes, Likes und Kommentaren.

Dadurch ergeben sich folgende Vorteile:

- Das ursprüngliche Token erscheint nicht in Abstimmungs-, Like- oder Kommentardaten.
- Selbst bei Einsicht in operative Datenbanktabellen ist keine direkte Rekonstruktion des Zugangstokens möglich.
- Die Trennung zwischen Zugangskontrolle und Beteiligungsdaten stärkt das Prinzip der Datensparsamkeit.
- Mehrfachteilnahmen können systemseitig kontrolliert werden, ohne persönliche Identitäten offenzulegen.

Dieses Vorgehen entspricht einem Privacy-by-Design-Ansatz#super[3].

== Funktionale Einbettung in RaumVote

Das Token-Konzept ist nicht als isolierter Login-Mechanismus zu verstehen, sondern als tragendes Fundament der Nutzungslogik. Alle relevanten API-Endpunkte folgen demselben Grundmuster:

1. Token entgegennehmen,
2. Token validieren,
3. Token in einen Hash überführen,
4. Aktion mit pseudonymisierter Kennung ausführen,
5. Ergebnis als JSON zurückgeben.

Dies betrifft insbesondere das Abstimmen, Liken, Kommentieren sowie das Abrufen nutzerspezifischer Statusinformationen.

== Risiken und Grenzen

Trotz seiner Vorteile ist das Token-Konzept nicht frei von Risiken:

*QR-Code-Weitergabe via Social Media:* Wenn ein QR-Code fotografiert und auf Social Media geteilt wird, können theoretisch beliebig viele Personen mit demselben Token abstimmen. Da das Prinzip „1 Token = 1 Stimme per voterHash" gilt, kann ein weitergegebener Token zur Stimmenmanipulation genutzt werden. Die Konsequenz: Die Ergebnisse einer Beteiligungsrunde könnten verzerrt werden, wenn ein Token viral geht. Als Gegenmassnahme können verdächtige Tokens administrativ deaktiviert werden.

*Geräte-Sharing:* Wenn mehrere Personen dasselbe Gerät nutzen, teilen sie sich denselben `localStorage` und damit denselben Token. In Schulkontexten (z.B. Klassenzimmer-Tablet) ist dies ein realistisches Szenario.

*Monitoring:* Das System kann ungewöhnliche Voting-Muster erkennen, etwa eine ungewöhnlich hohe Aktivität eines einzelnen voterHash in kurzer Zeit. Solche Muster lassen auf Missbrauch schliessen und können administrativ untersucht und durch Token-Deaktivierung behoben werden.

Im Kontext des Projekts ist diese Grenze jedoch vertretbar, da nicht eine rechtlich verbindliche Abstimmung, sondern ein partizipativer Mitwirkungsprozess im Vordergrund steht. Für kommunale Beteiligungsformate mit jugendlicher Zielgruppe ist eine verhältnismässige Lösung oft sinnvoller als ein hochschwelliges Authentifizierungssystem.

== Fazit

Das Token-Konzept von RaumVote ist ein zweckmässiger Ansatz, um digitale Jugendbeteiligung einfach, pseudonymisiert und kontrolliert zu ermöglichen. Es verbindet QR-basierte Zugangserleichterung mit serverseitiger Validierung und hashbasierter Pseudonymisierung. Dadurch wird ein Gleichgewicht zwischen Nutzungsfreundlichkeit, Zugangskontrolle und Datenschutz geschaffen.

// ─────────────────────────────────────────
// KAPITEL 9: TESTKONZEPT
// ─────────────────────────────────────────

= Testkonzept

== Testdesign

=== Zielsetzung

Ziel des Tests ist es, zu überprüfen, ob RaumVote für Jugendliche verständlich, intuitiv und technisch zuverlässig nutzbar ist. Dabei soll insbesondere bewertet werden, ob:

- der Einstieg ins Tool einfach funktioniert,
- die Navigation durch den Beteiligungsprozess logisch und nachvollziehbar ist,
- die wichtigsten Funktionen korrekt genutzt werden können,
- die mobile Nutzung und Lesbarkeit gewährleistet sind,
- das Tool zur aktiven Beteiligung motiviert,
- Datenschutz und Vertrauenswürdigkeit nachvollziehbar wirken und
- die erzielten Ergebnisse für den weiteren Beteiligungs- und Planungsprozess brauchbar sind.

=== Testumfang

Geprüft werden die zentralen Bestandteile von RaumVote in Bezug auf Usability, Funktionalität und fachliche Eignung:

- Einstieg über QR-Code bzw. Token-Login,
- Start der Session,
- Navigation durch den binären Entscheidungsbaum,
- Aufruf einzelner Optionen,
- Voting-, Like- und Kommentarfunktion,
- Ansicht der Resultate und Profilbereich,
- mobile und responsive Nutzbarkeit,
- Wahrnehmung von Datenschutz und Vertrauenswürdigkeit,
- Anschlussfähigkeit der Ergebnisse für den weiteren Planungsprozess.

=== Testmethode

Der Test wird als moderierter Usability- und Funktionstest durchgeführt. Dabei bearbeiten Testpersonen typische Aufgaben selbstständig, während Beobachtungen zur Bedienung, Verständlichkeit und technischen Funktion festgehalten werden. Ergänzend wird die Methode Thinking Aloud#super[5] eingesetzt, damit die Testpersonen während der Nutzung ihre Gedanken, Erwartungen und Unsicherheiten aussprechen.

== Testdurchführung

=== Einführung

- Begrüssung und Erklärung des Testziels
- Kurze Einführung in RaumVote
- Erklärung der Testkriterien und der Bewertungsskala
- Hinweis auf Datenschutz und anonymisierte Nutzung im Test

=== Testphase

Die Testperson bearbeitet folgende Aufgaben eigenständig:

1. Melde dich über den bereitgestellten Zugang an.
2. Starte die Session.
3. Navigiere durch mehrere Entscheidungsschritte im Beteiligungsbaum.
4. Öffne eine Option in der Detailansicht.
5. Vergib ein Like.
6. Gib eine Stimme für eine Idee ab.
7. Schreibe einen Kommentar.
8. Prüfe die Resultate.
9. Öffne dein Profil.
10. Beurteile, ob du den Ablauf ohne Hilfe verstanden hast.

=== Abschlussgespräch

Im Anschluss werden allgemeine Fragen besprochen:

- Was war leicht verständlich? Was war unklar?
- Welche Funktionen haben gut funktioniert? Wo gab es Probleme?
- Würdest du das Tool freiwillig nutzen?
- Hattest du Vertrauen in den Umgang mit deinen Daten?
- Sind die Ergebnisse nachvollziehbar und sinnvoll?

== Bewertungskriterien

Die Bewertung erfolgt auf einer Skala von 1 bis 5:

- Vollständigkeit der Informationsanzeige
- Eingabemöglichkeiten
- Logik und Nachvollziehbarkeit
- Usability und Nutzerfreundlichkeit
- Optische Gestaltung und Lesbarkeit
- Effizienz der Nutzung
- Mobile / Responsive Design
- Funktionalität der Kernfeatures
- Verständlichkeit des Einstiegs
- Motivation zur Beteiligung
- Datenschutz und Vertrauenswürdigkeit
- Barrierefreiheit / Zugänglichkeit
- Anschlussfähigkeit der Ergebnisse

== Fazit und nächste Schritte

Im Rahmen des Projekts wurden keine eigenen Tests mit realen Nutzer:innen durchgeführt. Dies ist auf mehrere Faktoren zurückzuführen: Erstens liessen die zeitlichen Einschränkungen des Projektzeitrahmens keinen vollständigen Testzyklus zu. Zweitens war der Zugang zur eigentlichen Zielgruppe (Jugendliche im Semesterkontext) nicht realistisch herzustellen. Drittens wurde bewusst priorisiert, die konzeptionellen und technischen Grundlagen zuerst vollständig auszuarbeiten, bevor eine Evaluation stattfindet. Das entwickelte Testkonzept kann dem Case Owner jedoch als Grundlage dienen, um RaumVote zu einem späteren Zeitpunkt zu evaluieren.

// ─────────────────────────────────────────
// KAPITEL 10: TECHNISCHE DOKUMENTATION
// ─────────────────────────────────────────

= Technische Dokumentation

== Übersicht

RaumVote ist eine Mobile-First-Abstimmungsanwendung, bei der Nutzer:innen durch KI-generierte binäre Entscheidungsbäume navigieren, indem sie nach links oder rechts wischen. Jede Auswahl teilt sich in zwei neue Optionen auf, bis der oder die Nutzende ein Blatt erreicht, für das abgestimmt werden kann. Die Anwendung basiert auf Next.js 16 (App Router), React 19, Prisma 7 mit PostgreSQL (Neon) und nutzt GPT-4o für die Baumgenerierung sowie Gemini/HuggingFace für die Bildgenerierung.

== Architektur

=== Sessions und Entscheidungsbäume

Das zentrale Datenmodell ist die `VotingSession`. Jede Session besitzt einen vollständigen binären Entscheidungsbaum. Sessions durchlaufen folgenden Lebenszyklus: `draft` (Entwurf) → `active` (aktiv) → `archived` (archiviert). Es darf jeweils nur eine Session im Zustand „draft" oder „active" existieren. Archivierte Sessions sind schreibgeschützt.

Baumknoten (`TreeNode`) werden in einer selbstreferenzierenden Tabelle gespeichert. Jeder Knoten besitzt eine `parentId`, eine Seite (`side`: „left" oder „right") und eine Tiefe (`depth`). Ein Unique-Constraint auf `(parentId, side)` garantiert die binäre Struktur. Der Wurzelknoten hat `side = null` und `depth = 0`.

Wenn eine nutzende Person zu einem Knoten navigiert, dessen Kinder noch nicht generiert wurden, ruft das System GPT-4o mit dem vollständigen Pfad vom Wurzelknoten zum aktuellen Knoten (der sogenannten „Episode") als Kontext auf.

=== Datenbankschema

Das PostgreSQL-Schema (verwaltet durch Prisma) besteht aus 10 Modellen:

- *VotingSession:* Wurzelaggregat mit Baumkonfiguration, Zeitsteuerung und Status.
- *TreeNode:* Binärer Baumknoten. Speichert Titel, Beschreibung, Kontext, Frage, Media-URL und Discovery-Tracking.
- *Vote:* Eine Stimme pro Wähler:in pro Session. Unique auf `(sessionId, voterHash)`.
- *Like:* Ein Like pro Wähler:in pro Option pro Session. Unique auf `(sessionId, optionId, voterHash)`.
- *Comment:* Verschachtelte Kommentare zu Optionen. Selbstreferenzierende `parentId` für Antworten.
- *CommentLike:* Ein Like pro Wähler:in pro Kommentar. Unique auf `(commentId, voterHash)`.
- *User:* Profildaten. Schlüssel ist `voterHash`. Speichert optionalen Benutzernamen und Avatar-URL.
- *AccessToken:* Vorab erstellte UUID-Tokens mit `active`-Flag zur Deaktivierung.
- *ImageTask:* Verfolgt Bildgenerierungsaufträge. Status-Lebenszyklus: `pending` → `generating` → `completed/failed`.
- *JobQueue:* Allgemeine Job-Warteschlange für Hintergrundarbeiten. Nutzt `SELECT ... FOR UPDATE SKIP LOCKED`.

== Projektstruktur

#table(
  columns: (4cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Verzeichnis / Datei*], [*Beschreibung*],
  [`app/`], [Next.js App Router, Seiten und API-Routen],
  [`app/api/`], [33 API-Endpunkte (Admin, Auth, Tree, Vote, Like, Comment, Results usw.)],
  [`app/n/[nodeId]/`], [Split-Screen binäre Auswahl-UI (Hauptabstimmungsseite)],
  [`app/o/[optionId]/`], [Einzelne Optionsdetailansicht],
  [`app/login/[token]/`], [QR-Code-Login-Ablauf],
  [`app/start/`], [Willkommensbildschirm mit PWA-Installationshinweisen],
  [`app/results/`], [Bestenliste],
  [`app/dream/`], [Aktuelle Wahl der Nutzenden],
  [`app/me/`], [Profilbearbeitung],
  [`app/admin/`], [Admin-Dashboard (Sessions, Tokens, Knoten, Bilder, Infrastruktur)],
  [`app/denied/`], [Zugang-verweigert-Seite],
  [`components/`], [Geteilte UI-Komponenten (ActionRail, CommentBottomSheet, GlobalTabbar usw.)],
  [`lib/`], [21 Hilfsmodule (Auth, Tree, Voting, Bildgenerierung, Queue usw.)],
  [`prisma/`], [Schema und Migrationen],
  [`lib/adminAuth.ts`], [Admin-Authentifizierung: liest und prüft den `rv-admin-jwt`-Cookie],
  [`lib/getVoter.ts`], [Voter-Identität: liest `x-voter-hash`-Header oder validiert `voterId` gegen die Datenbank],
  [`worker.ts`], [Eigenständiger Hintergrund-Job-Prozessor],
)

== Authentifizierung und Datenschutz

=== Token-basierter Zugang

Der Zugang wird über vorab erstellte Tokens gesteuert. Ein Administrator generiert UUID-Tokens über die `/admin`-Oberfläche. Diese Tokens werden als QR-Codes verteilt, die die URL `/login/{token}` kodieren.

Wenn eine nutzende Person einen QR-Code scannt, läuft folgender Prozess ab:

1. Der Browser navigiert zu `/login/{token}`.
2. Der Client ruft `POST /api/auth/login` mit dem Token auf.
3. Der Server validiert das Token gegen die `AccessToken`-Tabelle.
4. Bei Gültigkeit signiert der Server ein JWT mit dem Voter-Hash und setzt es als `httpOnly`-Cookie (`rv-jwt`, 30 Tage).
5. Die rohe `voterId` wird im `localStorage` des Browsers gespeichert, damit sie für direkte API-Aufrufe (z.B. Status-Abfragen) als Fallback verfügbar ist.
6. Die nutzende Person wird zu `/start` weitergeleitet.

=== Admin-Authentifizierung

Der Zugang zum Admin-Bereich unterscheidet sich bewusst vom Voter-Zugang. Anstelle von vorab generierten QR-Tokens wird ein einziges gemeinsames Passwort (`ADMIN_SECRET`) verwendet, das in der Umgebungsvariable hinterlegt ist.

Der Anmeldeablauf funktioniert wie folgt:

1. Die administrierende Person gibt das Passwort im Admin-Login-Formular ein.
2. Der Client sendet es via `POST /api/admin/auth/login` an den Server.
3. Der Server prüft das Passwort gegen `ADMIN_SECRET`.
4. Bei Übereinstimmung wird ein kurzlebiges JWT (8 Stunden, Issuer `raumvote-admin`) erstellt und als `httpOnly`-Cookie (`rv-admin-jwt`) gesetzt.
5. Alle nachfolgenden Admin-API-Aufrufe werden serverseitig anhand dieses Cookies verifiziert, ohne dass das Passwort erneut übertragen wird.

*Abgrenzung zum Voter-JWT:* Voter-JWTs nutzen den Issuer `raumvote` und laufen 30 Tage. Admin-JWTs nutzen den Issuer `raumvote-admin` und laufen 8 Stunden. Die Cookies heissen `rv-jwt` bzw. `rv-admin-jwt` und werden separat validiert.

*Warum kein individueller Admin-Account?* Im aktuellen Einsatzszenario wird der Admin-Bereich ausschliesslich von einem kleinen, bekannten Personenkreis genutzt (z.B. Projektteam und Gemeindemitarbeitende). Individuelle Credentials würden eine Benutzerverwaltung erfordern, die den Umfang des MVP übersteigt. Das geteilte `ADMIN_SECRET` ist für diesen Kontext verhältnismässig und akzeptabel. Für eine breitere Rollenzuteilung (z.B. „Leserecht" vs. „Schreibrecht") wäre OAuth/OIDC die geeignete Erweiterung.

=== Datenschutz der Wähler:innen

Rohe Voter-Tokens werden niemals in Abstimmungs-, Like- oder Kommentardatensätzen gespeichert. Alle Datenbankeinträge verwenden einen `voterHash`, einen SHA-256-Hash aus `{VOTER_PEPPER}:{voterId}`. Die Umgebungsvariable `VOTER_PEPPER` ist zwingend erforderlich.

== Kernfunktionen

=== Abstimmungsmechanismus

Die Abstimmung nutzt ein Toggle/Upsert-Muster. Jede wählende Person kann höchstens eine aktive Stimme pro Session abgeben.

Beim Aufruf von `POST /api/vote`:
- Hat die Person bereits für dieselbe Option gestimmt, wird die Stimme gelöscht (Toggle aus).
- Hat die Person für eine andere Option gestimmt oder noch nicht abgestimmt, wird die Stimme per Upsert auf die neue Option gesetzt.

=== Baumgenerierung

Baumknoten werden bei Bedarf über GPT-4o generiert. Wenn eine nutzende Person zu einem Knoten navigiert, dessen Kinder noch nicht existieren:

1. Das System traversiert vom aktuellen Knoten zur Wurzel und sammelt die „Episode".
2. Die Episode wird an GPT-4o mit dem `systemPrompt` der Session gesendet.
3. GPT-4o liefert eine Frage und zwei Kindknoten (links/rechts).
4. Die neuen Knoten werden in der Datenbank persistiert.
5. Bildgenerierungsaufträge werden für die neuen Knoten eingereiht.

*Vor-Generierung:* Um die Latenz zu reduzieren, löst der Client einen `prefetchGenerate()`-Aufruf aus, wenn eine Person auf einer Knotenseite landet. Damit werden Enkel-Knoten voraus generiert.

=== Bildgenerierung

Jeder Baumknoten besitzt eine `mediaUrl`, die zunächst auf einen Platzhalter verweist. Die Bildgenerierung erfolgt asynchron:

1. Beim Erstellen neuer Knoten werden `ImageTask`-Datensätze mit Status „pending" angelegt.
2. Ein Worker beansprucht Aufgaben mittels optimistischem Locking mit `SKIP LOCKED`.
3. Der Worker ruft das konfigurierte Bildmodell auf (Gemini oder HuggingFace).
4. Generierte Bilder werden auf Cloudflare R2 hochgeladen und die `mediaUrl` des Knotens aktualisiert.
5. Der Client pollt `GET /api/tree/node/images` alle 3 Sekunden bis zur Fertigstellung.

=== Discovery-System

Die erste Person, die einen bisher unbesuchten Knoten besucht, wird als Entdecker:in erfasst (`discovererHash`, `discoveredAt`). Die UI zeigt ein Feier-Modal, wenn `isDiscoverer` in der Generierungsantwort `true` ist. Das Discovery-Feature kann pro Session über das `discoveryEnabled`-Flag aktiviert oder deaktiviert werden.

== API-Design

Alle API-Routen folgen einem einheitlichen Muster:

1. Parameter extrahieren und validieren.
2. Wähleridentität über `getVoterHash()` auflösen.
3. Datenbankoperation über Prisma ausführen.
4. JSON-Antwort zurückgeben.

=== Wichtige API-Endpunkte

#table(
  columns: (2.5cm, 4cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Bereich*], [*Endpunkte*], [*Beschreibung*],
  [Auth], [`/api/auth/login, /validate, /me`], [Token-Austausch, JWT-Ausstellung, Identitätsprüfung],
  [Tree], [`/api/tree/node, /generate, /node/images`], [Knotendaten, On-Demand-Generierung, Bild-Polling],
  [Voting], [`/api/vote, /vote/status`], [Stimmen-Toggle und Statusabfrage],
  [Social], [`/api/like, /comment, /comment/like`], [Likes und verschachtelte Kommentare],
  [Session], [`/api/session, /results`], [Aktive Session-Metadaten und Bestenliste],
  [Admin], [`/api/admin/session, /tokens, /image-tasks, /tree-reset`], [Vollständiges CRUD für Sessions, Tokens und Bildaufgaben],
)

== Frontend-Architektur

=== Responsives Design

Die Anwendung nutzt ein JavaScript-basiertes responsives System (`useResponsive`-Hook) mit drei Breakpoints:

- *Small* (unter 540 px): Hochformat-Smartphone.
- *Medium* (540 px bis 1080 px): Querformat-Tablet.
- *Large* (ab 1080 px): Desktop.

=== Geteilte Komponenten

*ActionRail:* Eine vertikale Spalte aus 52 px grossen runden Buttons (TikTok-Stil) für Like-, Abstimmungs-, Kommentar- und Teilen-Aktionen. Nutzt `e.stopPropagation()`, um Klick-Bubbling zu verhindern.

*CommentBottomSheet:* Ein fixiertes Bottom-Sheet (60 % der Viewport-Höhe, z-index 201) mit Ziehgriff, scrollbarem Kommentar-Thread und Like-Toggles. Zeichenlimit: 500.

*GlobalTabbar:* Fixierte Fussnavigation (64 px Höhe, z-index 100) mit 4 Tabs: Start, Ergebnisse, Traum und Profil.

=== Wisch-Navigation

Die binäre Auswahlseite (`/n/[nodeId]`) nutzt einen eigenen `useSwipeChoice`-Hook für Gestenerkennung. Nutzer:innen können nach links oder rechts wischen, um eine Auswahl zu treffen.

== Hintergrundverarbeitung

=== Eigenständiger Worker

Die Datei `worker.ts` stellt einen eigenständigen Node.js-Prozess bereit:

```
npx tsx worker.ts
```

Der Worker führt eine Polling-Schleife alle 2 Sekunden aus und verarbeitet `ImageTask`- und `JobQueue`-Einträge mittels `SKIP LOCKED`.

=== Inline-Verarbeitung

In Umgebungen ohne dedizierten Worker (z.B. Vercel mit 10-Sekunden-Funktions-Timeout) werden Bildaufgaben inline über `processImageTasksInBackground()` verarbeitet. Optimistisches Locking verhindert doppelte Arbeit.

== Deployment und Konfiguration

=== Umgebungsvariablen

*Erforderlich:*

#table(
  columns: (4.5cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Variable*], [*Beschreibung*],
  [`DATABASE_URL`], [Neon-Pooled-PostgreSQL-Verbindungsstring],
  [`DIRECT_URL`], [Neon-Direktverbindung (für Migrationen)],
  [`VOTER_PEPPER`], [Geheimer Pepper für SHA-256-Voter-ID-Hashing],
  [`ADMIN_SECRET`], [Passwort für Admin-Login; wird serverseitig gegen ein kurzlebiges JWT ausgetauscht],
)

*Optional:*

#table(
  columns: (4.5cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Variable*], [*Beschreibung*],
  [`JWT_SECRET`], [JWT-Signierungsgeheimnis (Fallback auf VOTER_PEPPER)],
  [`OPENAI_API_KEY`], [GPT-4o-API-Schlüssel für Baumgenerierung],
  [`GEMINI_API_KEY`], [Gemini-API-Schlüssel für Bildgenerierung],
  [`R2_ENDPOINT`], [Cloudflare-R2-S3-kompatibler Endpunkt],
  [`R2_ACCESS_KEY_ID`], [R2-Zugangsdaten],
  [`R2_SECRET_ACCESS_KEY`], [R2-Zugangsdaten (Secret)],
  [`R2_BUCKET_NAME`], [R2-Bucket-Name],
  [`R2_PUBLIC_URL`], [Öffentliches URL-Präfix für R2-Assets],
)

=== Build und Ausführung

#table(
  columns: (5cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Befehl*], [*Beschreibung*],
  [`npm run build`], [Prisma-Client generieren + Next.js bauen],
  [`npm run dev`], [Entwicklungsserver starten],
  [`npm run lint`], [ESLint-Prüfungen ausführen],
  [`npx tsx worker.ts`], [Hintergrund-Worker starten (Produktion)],
)

=== Datenbankmigrationen

#table(
  columns: (7cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Befehl*], [*Beschreibung*],
  [`npx prisma migrate dev --name <Name>`], [Migration erstellen und anwenden],
  [`npx prisma generate`], [Prisma-Client neu generieren],
)

== Anforderungen und Traceability

=== Requirements Traceability

#table(
  columns: (1.8cm, 3.5cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*User Story*], [*Anforderung*], [*Technische Umsetzung*],
  [US-01], [Schutz vor Spam und Missbrauch], [Unique-Constraint `(sessionId, voterHash)` verhindert Mehrfachabstimmung; Token-Deaktivierung via Admin; Kommentare pseudonymisiert via `voterHash`],
  [US-02], [Digitaler Austausch], [Verschachtelte Kommentare (`parentId`); Like-Toggle auf Optionen; CommentBottomSheet-UI; Badge-Zähler auf ActionRail],
  [US-03], [Niederschwelliger mobiler Zugang], [Mobile-First (`useResponsive`-Hook, 3 Breakpoints); QR-Code-Login ohne Registrierung; Swipe-Navigation (`useSwipeChoice`); PWA-Hinweise],
  [US-04], [Ergebnisse für Planungsprozesse], [Aggregierte Bestenliste auf `/results`; sessionspezifische Ergebnisse; archivierte Sessions bleiben einsehbar],
  [US-05], [Breite Erreichbarkeit], [QR-Distribution; keine Registrierungspflicht; anonyme Nutzung via `voterHash`; deutsche UI],
)

=== Nicht-funktionale Anforderungen

#table(
  columns: (2.5cm, 4cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Kategorie*], [*Anforderung*], [*Zielwert*],
  [Performance], [Antwortzeit Baumgenerierung (GPT-4o)], [< 58 s #footnote[Basierend auf gemessenen GPT-4o-Antwortzeiten im Testbetrieb. Während der Wartezeit wird der Nutzerin/dem Nutzer ein Lade-Bildschirm angezeigt.]],
  [Performance], [Antwortzeit API-Endpunkte (ohne KI)], [< 200 ms],
  [Performance], [Bildgenerierung (Gemini/HuggingFace)], [< 20 s],
  [Skalierbarkeit], [Gleichzeitige Nutzer:innen], [25 bis 50],
  [Verfügbarkeit], [Uptime-Ziel], [99.5 %],
  [Datenschutz], [Keine Roh-Tokens in Fachdaten], [Erfüllt (SHA-256 + VOTER_PEPPER)],
  [Datenschutz], [DSGVO-orientierte Architektur], [Pseudonymisierung, Minimaldatenspeicherung],
  [Usability], [Mobile-First], [Erfüllt (`useResponsive`-Hook, 3 Breakpoints)],
  [Usability], [Sprache], [Deutsch],
  [Sicherheit], [Admin-Zugriffskontrolle], [JWT-Cookie (`rv-admin-jwt`, 8 h, httpOnly, Issuer `raumvote-admin`)],
  [Sicherheit], [Voter-JWT-Cookie], [httpOnly, 30 Tage Gültigkeit, Issuer `raumvote`],
)

== Architekturentscheide

#table(
  columns: (2.5cm, 3cm, 3cm, 1fr),
  stroke: 0.5pt,
  inset: 6pt,
  [*Entscheid*], [*Gewählt*], [*Alternativen*], [*Begründung*],
  [Framework], [Next.js 16 (App Router)], [SvelteKit, Remix, Nuxt], [Next.js bietet ein sehr grosses Ökosystem, beste Vercel-Integration und war dem Team bekannt. SvelteKit hätte ein kleineres Bundle geliefert, aber das Ökosystem und das Deployment-Setup wären aufwändiger gewesen.],
  [Frontend], [React 19], [Svelte, Vue, Solid], [Sehr etabliert; ermöglicht US-03 (Mobile-First, Swipe) einfach zu realisieren; Teamkompetenz vorhanden.],
  [ORM], [Prisma 7], [Drizzle, TypeORM, Knex], [Prisma generiert typsichere Client-Typen, die im gesamten Monorepo geteilt werden. Konkret bedeutet dies: Modelle, die im Prisma-Schema definiert werden, stehen automatisch als TypeScript-Typen für API-Routen, Hooks und UI-Komponenten zur Verfügung. Dies reduziert Fehler und erhöht die Wartbarkeit bei der Teamzusammenarbeit.],
  [Datenbank], [Neon PostgreSQL], [Supabase, PlanetScale], [Neon bietet einen grosszügigen Free-Tier und ist sehr etabliert. Supabase würde zwar mehr Features (Auth, Storage) mitliefern, aber da RaumVote ein eigenes Token-Konzept und Cloudflare R2 nutzt, wären diese Features nicht nötig. Neon ist schlanker und direkter integrierbar.],
  [Baumgenerierung], [GPT-4o (OpenAI)], [Claude, Gemini, OSS LLMs], [Strukturierte JSON-Schema-Ausgabe, zuverlässige Qualität und breite Dokumentation.],
  [Bildgenerierung], [Gemini / HuggingFace], [DALL-E, Stable Diffusion], [Erfüllt die verlangten Qualitätsansprüche für einen PoC und kann kostenlos verwendet werden. Evaluiert wurden DALL-E (kostenpflichtig), Stable Diffusion (Hosting-Aufwand) und Gemini (gutes Verhältnis von Qualität und Kosten).],
  [Bildspeicher], [Cloudflare R2], [AWS S3, Vercel Blob], [S3-kompatibel, etabliert und kostenlos bis 10 GB.],
  [Deployment], [Vercel], [Railway, Fly.io], [Passt optimal zu Next.js, ermöglicht schnellen Go-Live ohne Konfigurationsaufwand.],
  [Auth-Konzept], [Token + JWT + voterHash], [OAuth, Magic Links], [Privacy-First: keine personenbezogenen Daten, QR-basiert, niederschwellig.],
)

== Fehlerbehandlung und Resilience

#table(
  columns: (3cm, 1fr, 2.5cm),
  stroke: 0.5pt,
  inset: 6pt,
  [*Fehlerquelle*], [*Aktuelles Verhalten*], [*Offene Punkte*],
  [GPT-4o nicht erreichbar], [Im Hintergrund-Worker: automatischer Retry (bis 3 Versuche). Im Vordergrund: Fehler 500, Person kann Seite neu laden.], [Kein automatischer Retry im Vordergrund.],
  [Bildgenerierung fehlgeschlagen], [Automatischer Retry (3 Versuche) durch den Worker. Fehlergrund wird gespeichert.], [Kein Backoff zwischen Retries.],
  [Neon-DB nicht erreichbar], [Alle Anfragen schlagen mit Fehler 500 fehl. Worker verbindet sich automatisch neu.], [App ohne DB komplett nicht nutzbar.],
  [R2-Upload fehlschlägt], [Nodes werden trotzdem erstellt, Nutzer:innen sehen Platzhalter-Bilder. Worker versucht es bis zu 3× erneut.], [App bleibt funktional.],
  [Ungültiges Token], [Weiterleitung zu `/denied`], [Abgedeckt],
  [Session abgelaufen], [Votes werden abgelehnt (Fristprüfung)], [Abgedeckt],
  [Concurrency], [Unique-Constraint + SKIP LOCKED], [Abgedeckt],
  [Worker-Ausfall], [Railway startet den Worker automatisch neu (bis 10×). Offene Jobs bleiben in der DB.], [Alerting / Monitoring],
)

== Bekannte Limitierungen

Die folgenden Limitierungen sind im aktuellen MVP bekannt:

- *Vercel-Funktions-Timeout (10 s):* Bildgenerierung und Baumgenerierung können das Timeout überschreiten. Workaround: eigenständiger Worker für Produktion.
- *Token-Weitergabe:* QR-Codes können fotografiert und weitergegeben werden (bewusste Design-Entscheidung zugunsten Niederschwelligkeit).
- *Keine Offline-Fähigkeit:* Trotz `localStorage`-Fallback ist die App nicht offline nutzbar.
- *Einzelne aktive Session:* Nur eine Session kann gleichzeitig aktiv sein.
- *User-Interaktionen (Vote, Likes, Kommentare) können momentan noch nicht via Admin-GUI gelöscht werden.*
- *Barrierefreiheit:* Nicht vollständig implementiert; müsste für den Produktionseinsatz ausgearbeitet werden.
- *Einzelner Admin-Account:* Der Admin-Zugang basiert auf einem geteilten `ADMIN_SECRET`-Passwort. Individuelle Admin-Accounts mit unterschiedlichen Berechtigungsstufen (z.B. Lesen vs. Schreiben) sind nicht vorgesehen. Für grössere Organisationen wäre OAuth/OIDC die geeignete Erweiterung.
- *Kein Rate Limiting:* API-Endpunkte sind nicht gegen Anfragehäufung gesichert. In einer Produktionsumgebung sollte ein Rate-Limiting-Layer (z.B. auf Vercel-Edge oder via API-Gateway) eingeführt werden.
- *Kein expliziter CSRF-Schutz:* Da das System JWT-Cookies mit `httpOnly` nutzt, besteht ein theoretisches CSRF-Risiko. Für den MVP wurde dies bewusst nicht adressiert; für den produktiven Einsatz wäre ein CSRF-Token-Mechanismus zu implementieren.

// ─────────────────────────────────────────
// KAPITEL 11: FAZIT
// ─────────────────────────────────────────

= Fazit

Im Rahmen dieser Projektarbeit wurde mit RaumVote ein digitaler Ansatz zur Förderung der Jugendbeteiligung im öffentlichen Raum konzipiert und prototypisch umgesetzt. Die Arbeit hat gezeigt, dass insbesondere niederschwellige, digitale Beteiligungsformate grosses Potenzial besitzen, die Partizipationslücke zu schliessen.

Durch die systematische Anwendung eines Design-Thinking-Prozesses#super[1] konnten die Bedürfnisse der Zielgruppe analysiert, in konkrete Anforderungen übersetzt und in Form eines funktionalen MVP umgesetzt werden. Dabei wurden konzeptionelle Grundlagen erarbeitet und zentrale technische sowie organisatorische Aspekte berücksichtigt.

Das entwickelte System zeigt exemplarisch, wie digitale Technologien eingesetzt werden können, um Beteiligung intuitiver, zugänglicher und strukturierter zu gestalten. Besonders hervorzuheben ist die Kombination aus Mobile-First-Ansatz, gamifizierter Interaktion und konsequent umgesetztem Privacy-by-Design-Prinzip. Damit gelingt es, sowohl den Anforderungen der jugendlichen Zielgruppe als auch den Rahmenbedingungen kommunaler Prozesse gerecht zu werden.

Gleichzeitig wird deutlich, dass es sich bei RaumVote bewusst um einen Prototyp handelt. Die Arbeit bildet eine fundierte Grundlage, zeigt aber auch Grenzen und Weiterentwicklungspotenziale auf, insbesondere im Hinblick auf Skalierbarkeit, Barrierefreiheit und langfristige Integration in reale Prozesse.

Neben den fachlichen und technischen Ergebnissen war die Arbeit auch ein Lernprozess. Die Auseinandersetzung mit einem realitätsnahen Problem und die iterative Entwicklung von Lösungen haben gezeigt, wie anspruchsvoll und wirkungsvoll interdisziplinäre Projekte sein können.

Persönlich hat uns dieses Projekt gelehrt, dass Digitalisierung nicht nur eine technologische, sondern vor allem eine gesellschaftliche Dimension besitzt. Es geht nicht nur darum, Systeme zu entwickeln, sondern echte Bedürfnisse zu verstehen und Lösungen zu gestalten, die einen Mehrwert für Menschen schaffen. Besonders eindrücklich war dabei die Erkenntnis, welches Potenzial in Jugendlichen steckt, wenn man ihnen eine Stimme gibt.

RaumVote ist ein Beitrag zur Frage, wie Beteiligung in einer digitalen Gesellschaft neu gedacht werden kann. Bereits mit einfachen, gut durchdachten Ansätzen lässt sich ein Zugang schaffen, der Menschen erreicht, aktiviert und einbindet. Genau darin liegt der konkrete Beitrag dieser Arbeit: ein praxisnahes Werkzeug, das kommunale Entscheidungsträger:innen und Jugendarbeit befähigt, Jugendliche dort abzuholen, wo sie sind.

// ─────────────────────────────────────────
// LITERATURVERZEICHNIS
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Literaturverzeichnis]

+ Brown, T. (2009). _Change by Design: How Design Thinking Transforms Organizations and Inspires Innovation_. HarperCollins.

+ Sinek, S. (2009). _Start with Why: How Great Leaders Inspire Everyone to Take Action_. Portfolio/Penguin.

+ Cavoukian, A. (2010). _Privacy by Design: The 7 Foundational Principles_. Information and Privacy Commissioner of Ontario, Canada. https://www.ipc.on.ca/wp-content/uploads/resources/7foundationalprinciples.pdf

+ Arnstein, S. R. (1969). A Ladder of Citizen Participation. _Journal of the American Institute of Planners_, 35(4), 216–224. https://doi.org/10.1080/01944366908977225

+ Nielsen, J. (1994). _Usability Engineering_. Morgan Kaufmann.

+ United Nations (1989). _Convention on the Rights of the Child_, Art. 12. United Nations Treaty Series, Vol. 1577. https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-child

+ Decidim Association (2024). _Decidim: Free Open-Source participatory democracy for cities and organizations_. https://decidim.org

+ Consul Democracy (2024). _Consul: Open Government and E-Participation Web Software_. https://consulproject.org

+ Senatskanzlei Berlin (2024). _meinBerlin – Berlins Beteiligungsplattform_. https://mein.berlin.de — Staatskanzlei NRW (2024). _Beteiligung.NRW_. https://www.beteiligung.nrw.de

+ National Institute of Standards and Technology – NIST (2015). _Secure Hash Standard (SHS)_. Federal Information Processing Standards Publication 180-4. https://doi.org/10.6028/NIST.FIPS.180-4

+ Fatke, R., & Schneider, H. (2005). Kinder- und Jugendpartizipation in Deutschland. _Aus Politik und Zeitgeschichte_, 12/2005, 6–13. Bundeszentrale für politische Bildung.

// ─────────────────────────────────────────
// ERKLÄRUNG ZUR URHEBERSCHAFT
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Erklärung zur Urheberschaft]

#table(
  columns: (3.5cm, 1fr),
  stroke: 0.5pt,
  inset: 7pt,
  [*Erklärung*], [Hiermit versichern wir, dass wir die vorliegende Arbeit selbstständig verfasst und keine anderen als die angegebenen Quellen und Hilfsmittel benutzt haben. Wir tragen die Verantwortung für die Qualität des Textes sowie die Auswahl aller Inhalte und haben sichergestellt, dass Informationen und Argumente mit geeigneten wissenschaftlichen Quellen belegt bzw. gestützt werden. Die aus fremden Quellen übernommenen Texte, Gedankengänge, Konzepte, Grafiken usw. in unseren Ausführungen haben wir als solche eindeutig gekennzeichnet und mit vollständigen Verweisen auf die jeweilige Quelle versehen. Die Arbeit wurde bisher keiner anderen Prüfungsbehörde vorgelegt und auch noch nicht veröffentlicht.],
  [*KI-Einsatz*], [Im Verlauf dieses Projekts wurden KI-gestützte Werkzeuge aktiv und durchgehend eingesetzt. Konkret kamen *ChatGPT* (OpenAI) und *Claude* (Anthropic) zum Einsatz – sowohl in der Konzeptionsphase (Brainstorming, Ideenentwicklung, Strukturierung) als auch in der Durchführungsphase (Planung, Textunterstützung, technische Guidance und Erstellung von Dokumentationsabschnitten).

Wir sind uns bewusst, dass die Nutzung maschinell generierter Texte keine Garantie für die Qualität von Inhalten und Text gewährleistet. Wir versichern, dass wir KI-Tools lediglich als Hilfsmittel eingesetzt haben, alle Inhalte kritisch geprüft, angepasst und verantwortet haben und der gestalterische Einfluss der Autoren in der vorliegenden Arbeit überwiegt. Wir haben keine KI-Schreibwerkzeuge verwendet, deren Nutzung die Prüfungsinstanz explizit ausgeschlossen hat.],
  [*Verstoss*], [Uns ist bekannt, dass ein Verstoss gegen die genannten Punkte prüfungsrechtliche Konsequenzen haben und dazu führen kann, dass die Prüfungsleistung mit «nicht ausreichend» bzw. «nicht bestanden» bewertet wird.],
  [*Ort/Datum*], [St. Gallen, 11. April 2026],
  [*Unterschriften*], [
    Felix Schiess \
    #v(1cm)
    Jovin Risch \
    #v(1cm)
    Luis Würgler
  ],
)

// ─────────────────────────────────────────
// ANHANG
// ─────────────────────────────────────────

#heading(numbering: none, level: 1)[Anhang]

== A. Prozessübersicht

_[Vollständige Prozessübersichtsgrafik – siehe eingereichte Beilage]_

== B. Study Case

_[Study Case – siehe eingereichte Beilage]_

== C. Gemeindeblatt

_[Gemeindeblatt – siehe eingereichte Beilage]_

== D. QR-Code Brief

_[QR-Code Brief – siehe eingereichte Beilage]_

== E. Testbogen

_[Testbogen – siehe eingereichte Beilage]_
