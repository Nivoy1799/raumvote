// RaumVote – IKTS Projektarbeit FS26
// Autoren: Felix Schiess · Jovin Risch · Luis Würgler

// ─────────────────────────────────────────────────────────────────────────────
// THEME — dark minimal
// ─────────────────────────────────────────────────────────────────────────────

#let c-bg      = rgb("#212121")
#let c-surface = rgb("#2f2f2f")
#let c-bar     = rgb("#171717")
#let c-border  = rgb("#444444")
#let c-text    = rgb("#ececec")
#let c-muted   = rgb("#8e8ea0")
#let c-section = rgb("#0d0d0d")
#let c-accent  = rgb("#4a8acf")

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

#let slide(title: none, presenter: none, body) = {
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
            #text(size: 8pt, fill: c-muted)[RaumVote · IKTS Projektarbeit FS26]
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
        if presenter != none { text(size: 9pt, fill: c-muted)[#presenter] },
      )
      v(1.5mm)
      line(length: 100%, stroke: 0.4pt + c-border)
      v(4mm)
    }
    #body
  ]
}

#let title-slide(title, subtitle, event, authors) = {
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
      #text(size: 10pt, fill: c-text)[#authors]
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
  inset: (x: 8pt, y: 6pt),
  width: 100%,
)[
  #align(center)[#text(size: 9.5pt, weight: "bold", fill: c-text)[#label]]
]

#let decision-card(title, body) = block(
  fill: c-surface,
  stroke: 0.5pt + c-border,
  radius: 2pt,
  inset: (x: 9pt, y: 5pt),
  width: 100%,
)[
  #text(size: 10pt, weight: "bold", fill: c-text)[#title]
  #v(1mm)
  #text(size: 8pt, fill: c-muted)[#body]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — TITEL
// ─────────────────────────────────────────────────────────────────────────────

#title-slide(
  "RaumVote",
  "„Deine Stimme für deinen Raum.\"",
  "IKTS Projektarbeit FS26 · OST",
  "Felix Schiess · Jovin Risch · Luis Würgler",
)

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — DAS PROBLEM
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Freitagabend, Dorfplatz.", presenter: "Felix Schiess")[
  #grid(
    columns: (1.15fr, 1fr),
    gutter: 8mm,
    [
      #v(1mm)
      #text(size: 11pt)[
        Jugendliche treffen sich, hören Musik, hängen ab. Anwohnende beschweren sich über Lärm. Die Gemeinde reagiert — meistens, ohne die Jugendlichen zu fragen.
      ]

      #v(4mm)
      #text(size: 9.5pt, fill: c-muted)[Klassische Beteiligungsformate erreichen diese Zielgruppe kaum:]

      #v(2.5mm)
      #decision-card("Passt nicht in den Alltag")[
        Schriftliche Vernehmlassungen, Abendsitzungen, formale Eingaben — nicht die Lebensrealität von 14- bis 18-Jährigen.
      ]
      #v(1.8mm)
      #decision-card("Wer keinen Verein hat, bleibt unsichtbar")[
        Genau die nicht-organisierten Jugendlichen — die das Gros der Raumnutzer:innen stellen — haben am wenigsten Stimme.
      ]
      #v(1.8mm)
      #decision-card("Ohne Datenschutz-Vertrauen keine ehrliche Beteiligung")[
        Wer nicht weiss, was mit der eigenen Meinung passiert, beteiligt sich nicht.
      ]
    ],
    [
      #v(10mm)
      #align(center)[
        #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 3pt, inset: (x: 14pt, y: 14pt), width: 95%)[
          #text(size: 16pt, weight: "bold", fill: c-text)[Art. 12 UN-KRK]
          #v(3mm)
          #text(size: 9pt, fill: c-text, style: "italic")[
            "Kinder und Jugendliche haben das Recht, in allen sie betreffenden Angelegenheiten gehört zu werden."
          ]
          #v(3mm)
          #text(size: 8pt, fill: c-muted)[
            Von der Schweiz ratifiziert — in der kommunalen Praxis selten konsequent umgesetzt.
          ]
        ]
      ]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — ENTSCHEIDUNGSVERLAUF
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Unsere Antwort", presenter: "Felix Schiess")[
  #v(2mm)
  Vier Prinzipien, die RaumVote von klassischen Beteiligungstools unterscheiden — direkt aus den Bedürfnissen der drei Stakeholder abgeleitet.

  #v(5mm)
  #grid(
    columns: (1fr, 1fr),
    gutter: 5mm,
    row-gutter: 5mm,
    [
      #tag("P1") *Anonym & niederschwellig* \
      #v(1mm)
      #text(size: 9pt, fill: c-muted)[
        Brief mit QR-Code, ein Scan, kein Account, keine E-Mail. Wer keinen Vereinszugang hat, kommt trotzdem rein.
      ]
    ],
    [
      #tag("P2") *Mobile & spielerisch* \
      #v(1mm)
      #text(size: 9pt, fill: c-muted)[
        Swipe statt Formular. Eine Frage pro Bildschirm. Bewusst angelehnt an die Mediennutzung der Zielgruppe.
      ]
    ],
    [
      #tag("P3") *Datenschutz von Grund auf* \
      #v(1mm)
      #text(size: 9pt, fill: c-muted)[
        Wir sehen keine Klarnamen. Identitäten werden vor der Speicherung verschlüsselt — Designprinzip, nicht Pflichtanhang.
      ]
    ],
    [
      #tag("P4") *Anschlussfähig für die Gemeinde* \
      #v(1mm)
      #text(size: 9pt, fill: c-muted)[
        Aggregierte Resultate als Rangliste — direkt einsetzbar in Planungsworkshops und kommunaler Verwaltung.
      ]
    ],
  )
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — KONZEPT / USER FLOW
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "So funktioniert RaumVote", presenter: "Felix Schiess")[
  #v(3mm)
  Drei Schritte vom QR-Brief zur abgegebenen Stimme — typischer Ablauf unter einer Minute.

  #v(8mm)
  #grid(
    columns: (1fr, auto, 1fr, auto, 1fr),
    column-gutter: 4mm,
    align: horizon,
    pipeline-node[
      *1 · QR scannen* \
      #v(1mm)
      #text(size: 8pt, fill: c-muted)[
        Brief enthält QR-Code. Ein Scan — Berechtigung wird lokal auf dem Handy gespeichert. Kein Login, kein Account.
      ]
    ],
    text(size: 14pt, fill: c-muted)[→],
    pipeline-node[
      *2 · Swipe durch den Baum* \
      #v(1mm)
      #text(size: 8pt, fill: c-muted)[
        Zwei Bildoptionen pro Schritt. Wisch nach links oder rechts — die nächste Ebene baut sich automatisch auf.
      ]
    ],
    text(size: 14pt, fill: c-muted)[→],
    pipeline-node[
      *3 · Wähle deinen Traumraum* \
      #v(1mm)
      #text(size: 8pt, fill: c-muted)[
        Eine finale Option als Stimme. Likes und Kommentare ergänzen den Austausch. Live-Rangliste sichtbar.
      ]
    ],
  )

  #v(10mm)
  #align(center)[
    #block(fill: c-surface, stroke: 0.5pt + c-border, radius: 2pt, inset: (x: 14pt, y: 8pt))[
      #text(size: 9pt, fill: c-muted)[
        *Output für die Gemeinde:* anonyme, aggregierte Präferenzkarte der Jugend — direkt einsetzbar in Planungsworkshops.
      ]
    ]
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — IMPLEMENTATION (VIDEO)
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Hinter den Kulissen", presenter: "Jovin Risch")[
  #v(8mm)
  #align(center + horizon)[
    #block(
      fill: c-section,
      stroke: 1pt + c-accent,
      radius: 4pt,
      inset: (x: 30pt, y: 24pt),
      width: 80%,
    )[
      #text(size: 40pt, fill: c-accent)[▶]
      #v(4mm)
      #text(size: 16pt, weight: "bold", fill: c-text)[Video · 1.5 min]
      #v(2mm)
      #text(size: 10pt, fill: c-muted)[
        Architektur · KI im Hintergrund · Datenschutz im Detail
      ]
      #v(6mm)
      #text(size: 8.5pt, fill: c-muted)[
        Datei: `implementation-jovin.mp4` — lokal abspielen, keine Netzabhängigkeit
      ]
    ]
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — ERKENNTNISSE
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "Was wir gelernt haben", presenter: "Luis Würgler")[
  #v(2mm)
  Vier inhaltliche Erkenntnisse — und eine persönliche.

  #v(4mm)
  #grid(
    columns: (1fr, 1fr),
    gutter: 4mm,
    row-gutter: 4mm,
    decision-card("Konzept vor Code")[
      Design Thinking hat sich gelohnt: zuerst Stakeholder verstehen, dann bauen. So entstand kein Tool für sich selbst, sondern eines, das drei klar definierte Bedürfnisse adressiert.
    ],
    decision-card("Drei Stakeholder, ein Tool")[
      Jugendliche wollen Niederschwelligkeit. Die Jugendarbeit braucht Moderation. Die Gemeinde will brauchbare Ergebnisse. Diese Perspektiven auszubalancieren war die zentrale Aufgabe.
    ],
    decision-card("Niederschwellig hat Grenzen")[
      Ein QR-Code kann fotografiert und weitergeleitet werden. Wir haben dieses Risiko bewusst akzeptiert und administrative Steuerungsmechanismen vorgesehen.
    ],
    decision-card("Test mit echten Jugendlichen steht aus")[
      Im Semester organisatorisch nicht machbar. Das Testkonzept liegt bereit — als klarer Auftrag für die nächste Phase.
    ],
  )

  #v(4mm)
  #block(fill: c-section, stroke: 0.5pt + c-accent, radius: 2pt, inset: (x: 12pt, y: 7pt), width: 100%)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 10pt,
      align: (left + horizon, left + horizon),
      text(size: 9pt, weight: "bold", fill: c-accent)[Persönlich],
      text(size: 9pt, fill: c-text)[
        Wir haben uns als Team sehr gut ergänzt. Die interdisziplinäre Zusammenarbeit zwischen Wirtschaftsingenieurwesen und Informatik war für uns alle eine echte Bereicherung.
      ],
    )
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — DEMO-AUFRUF
// ─────────────────────────────────────────────────────────────────────────────

#section-slide(
  "Jetzt seid ihr dran.",
  subtitle: "Bitte den QR-Code auf eurem Brief scannen — wir voten live.",
)

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — KI-DISCLAIMER
// ─────────────────────────────────────────────────────────────────────────────

#slide(title: "KI-Unterstützung")[
  #v(4mm)
  #grid(
    columns: (1fr, 1fr),
    gutter: 5mm,
    block(fill: c-surface, stroke: 0.5pt + c-border, radius: 3pt, inset: (x: 12pt, y: 10pt), width: 100%)[
      #text(size: 10pt, weight: "bold", fill: c-text)[In Arbeit & Präsentation]
      #v(3mm)
      #text(size: 8.5pt, fill: c-muted)[
        #grid(
          columns: (auto, 1fr),
          column-gutter: 8pt,
          row-gutter: 4pt,
          text(weight: "bold", fill: c-text)[Anthropic Claude],
          [Struktur, Text, technische Unterstützung beim Code],
          text(weight: "bold", fill: c-text)[OpenAI ChatGPT],
          [Konzeption, Recherche, Formulierungen],
        )
      ]
    ],
    block(fill: c-surface, stroke: 0.5pt + c-border, radius: 3pt, inset: (x: 12pt, y: 10pt), width: 100%)[
      #text(size: 10pt, weight: "bold", fill: c-text)[Im laufenden RaumVote-Betrieb]
      #v(3mm)
      #text(size: 8.5pt, fill: c-muted)[
        #grid(
          columns: (auto, 1fr),
          column-gutter: 8pt,
          row-gutter: 4pt,
          text(weight: "bold", fill: c-text)[OpenAI GPT-4o],
          [Generierung der Entscheidungsbäume],
          text(weight: "bold", fill: c-text)[Google Gemini],
          [Generierung der Bilder],
        )
      ]
    ],
  )
  #v(6mm)
  #text(size: 9pt, fill: c-muted, style: "italic")[
    KI wurde als Hilfsmittel eingesetzt. Alle Inhalte wurden kritisch geprüft und verantwortet — die gestalterische Verantwortung liegt bei den Autoren.
  ]
]

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — Q&A
// ─────────────────────────────────────────────────────────────────────────────

#section-slide(
  "Fragen?",
  subtitle: "Felix Schiess · Jovin Risch · Luis Würgler",
)
