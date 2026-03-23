import jsPDF from "jspdf";

type ExportOption = {
  rank: number;
  titel: string;
  beschreibung: string;
  context: string;
  votes: number;
  percentage: number;
  likes: number;
  comments: number;
};

type ExportData = {
  session: {
    id: string;
    title: string | null;
    status: string;
    startedAt: string | null;
    durationDays: number;
  };
  totalVotes: number;
  top5: ExportOption[];
  exportedAt: string;
};

export async function exportTop5Pdf(data: ExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = margin;

  const colors = {
    black: "#1a1a1a",
    grey: "#666666",
    lightGrey: "#999999",
    accent: "#2563eb",
    divider: "#e5e5e5",
    rankBg: "#f3f4f6",
  };

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(colors.accent);
  doc.text("RAUMVOTE", margin, y);

  doc.setTextColor(colors.lightGrey);
  doc.setFont("helvetica", "normal");
  doc.text("Abstimmungsergebnis", pw - margin, y, { align: "right" });
  y += 12;

  // --- Title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(colors.black);
  const title = data.session.title || "Top 5 — Entwurfsvorschläge";
  const titleLines = doc.splitTextToSize(title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 9 + 2;

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(colors.grey);
  doc.text("Die fünf meistgewählten Optionen zur Detailplanung", margin, y);
  y += 10;

  // --- Meta info bar ---
  doc.setFontSize(9);
  doc.setTextColor(colors.lightGrey);
  const exportDate = new Date(data.exportedAt).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startDate = data.session.startedAt
    ? new Date(data.session.startedAt).toLocaleDateString("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const metaLeft = `Exportiert: ${exportDate}  •  Session: ${data.session.id.slice(0, 12)}…`;
  const metaRight = `Start: ${startDate}  •  Stimmen total: ${data.totalVotes}`;
  doc.text(metaLeft, margin, y);
  doc.text(metaRight, pw - margin, y, { align: "right" });
  y += 4;

  // Divider
  doc.setDrawColor(colors.divider);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // --- Top 5 options ---
  for (const opt of data.top5) {
    // Check if we need a new page (need ~55mm for an entry)
    if (y + 55 > ph - margin) {
      doc.addPage();
      y = margin;
    }

    // Rank circle
    const circleX = margin + 6;
    const circleY = y + 1;
    doc.setFillColor(colors.rankBg);
    doc.circle(circleX, circleY, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(colors.black);
    doc.text(String(opt.rank), circleX, circleY + 1, { align: "center" });

    // Title
    const titleX = margin + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(colors.black);
    const optTitle = doc.splitTextToSize(opt.titel, contentW - 16);
    doc.text(optTitle, titleX, y + 2);
    y += optTitle.length * 5.5 + 3;

    // Stats line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.accent);
    const statsText = `${opt.votes} Stimmen (${opt.percentage}%)  •  ${opt.likes} Likes  •  ${opt.comments} Kommentare`;
    doc.text(statsText, titleX, y);
    y += 6;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(colors.grey);
    const desc = doc.splitTextToSize(opt.beschreibung || "Keine Beschreibung", contentW - 16);
    doc.text(desc, titleX, y);
    y += desc.length * 4.5 + 3;

    // Context (if present and different from description)
    if (opt.context && opt.context !== opt.beschreibung) {
      const ctxLabel = "Kontext: ";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(colors.lightGrey);
      doc.text(ctxLabel, titleX, y);
      const labelW = doc.getTextWidth(ctxLabel);
      doc.setFont("helvetica", "normal");
      const ctxLines = doc.splitTextToSize(opt.context, contentW - 16 - labelW);
      // Only print first 2 lines of context to keep it compact
      const ctxTruncated = ctxLines.slice(0, 2);
      doc.text(ctxTruncated, titleX + labelW, y);
      y += ctxTruncated.length * 4 + 2;
    }

    // Divider between entries
    y += 3;
    doc.setDrawColor(colors.divider);
    doc.setLineWidth(0.2);
    doc.line(margin + 16, y, pw - margin, y);
    y += 8;
  }

  // --- Footer notes ---
  if (y + 25 > ph - margin) {
    doc.addPage();
    y = margin;
  }

  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(colors.lightGrey);
  doc.text("Dieses Dokument wurde automatisch aus den RaumVote-Abstimmungsdaten generiert.", margin, y);
  y += 5;
  doc.text("Es dient als Grundlage für die Detailplanung durch das Architekturbüro.", margin, y);

  // Page number footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(colors.lightGrey);
    doc.text(`Seite ${i} von ${pageCount}`, pw / 2, ph - 10, { align: "center" });
  }

  // Download
  const filename = `RaumVote_Top5_${exportDate.replace(/\./g, "-")}.pdf`;
  doc.save(filename);
}
