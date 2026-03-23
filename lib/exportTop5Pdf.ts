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
  mediaUrl: string | null;
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

/** Fetch an image URL and return a base64 data URL, or null on failure. */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawBlackPage(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor("#000000");
  doc.rect(0, 0, pw, ph, "F");
}

export async function exportTop5Pdf(data: ExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pw - margin * 2;

  const c = {
    white: "#ffffff",
    textPrimary: "#f0f0f0",
    textSecondary: "#a0a0a0",
    textMuted: "#666666",
    accent: "#60a5fa",
    accentDim: "#3b82f6",
    cardBg: "#111111",
    cardBorder: "#222222",
    barBg: "#1a1a1a",
    barFill: "#60a5fa",
    rankGold: "#fbbf24",
    rankSilver: "#d1d5db",
    rankBronze: "#f59e0b",
  };

  const rankColors = [c.rankGold, c.rankSilver, c.rankBronze, c.accent, c.accent];

  // Pre-fetch all images in parallel
  const imagePromises = data.top5.map((opt) =>
    opt.mediaUrl ? fetchImageAsBase64(opt.mediaUrl) : Promise.resolve(null),
  );
  const images = await Promise.all(imagePromises);

  let y = margin;

  // ── Page 1: Cover ──
  drawBlackPage(doc);

  // Subtle top accent line
  doc.setFillColor(c.accent);
  doc.rect(margin, margin, contentW, 0.8, "F");
  y = margin + 8;

  // RAUMVOTE branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(c.accent);
  doc.text("RAUMVOTE", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(c.textMuted);
  doc.text("Abstimmungsergebnis", pw - margin, y, { align: "right" });
  y += 20;

  // Big title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(c.white);
  const title = data.session.title || "Top 5";
  const titleLines = doc.splitTextToSize(title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 11 + 4;

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(c.textSecondary);
  doc.text("Entwurfsvorschläge zur Detailplanung", margin, y);
  y += 16;

  // Meta info cards
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

  const metaItems = [
    { label: "Stimmen total", value: String(data.totalVotes) },
    { label: "Top Optionen", value: String(data.top5.length) },
    { label: "Abstimmungsstart", value: startDate },
    { label: "Export", value: exportDate },
  ];

  const metaW = (contentW - 6) / 4;
  for (let i = 0; i < metaItems.length; i++) {
    const mx = margin + i * (metaW + 2);
    doc.setFillColor(c.cardBg);
    doc.roundedRect(mx, y, metaW, 20, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(c.textMuted);
    doc.text(metaItems[i].label.toUpperCase(), mx + 5, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(c.white);
    doc.text(metaItems[i].value, mx + 5, y + 15.5);
  }
  y += 30;

  // Thin divider
  doc.setFillColor(c.cardBorder);
  doc.rect(margin, y, contentW, 0.3, "F");
  y += 12;

  // Compact overview list on cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(c.textMuted);
  doc.text("ÜBERSICHT", margin, y);
  y += 8;

  for (let i = 0; i < data.top5.length; i++) {
    const opt = data.top5[i];
    const rowY = y;

    // Rank number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(rankColors[i]);
    doc.text(String(opt.rank), margin + 2, rowY + 6);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(c.white);
    const overviewTitle = doc.splitTextToSize(opt.titel, contentW - 65);
    doc.text(overviewTitle[0], margin + 14, rowY + 4);

    // Vote bar
    const barX = margin + 14;
    const barW = contentW - 65;
    const barY = rowY + 7;
    doc.setFillColor(c.barBg);
    doc.roundedRect(barX, barY, barW, 4, 2, 2, "F");
    if (opt.percentage > 0) {
      doc.setFillColor(rankColors[i]);
      doc.roundedRect(barX, barY, Math.max(4, barW * (opt.percentage / 100)), 4, 2, 2, "F");
    }

    // Vote count + percentage
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(c.white);
    doc.text(`${opt.votes}`, pw - margin, rowY + 4, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(c.textMuted);
    doc.text(`${opt.percentage}%`, pw - margin, rowY + 10, { align: "right" });

    y += 18;
  }

  // ── Detail pages: one per option ──
  const imgW = 52;
  const imgH = 69; // 3:4 ratio
  const textAreaW = contentW - imgW - 10;

  for (let i = 0; i < data.top5.length; i++) {
    const opt = data.top5[i];
    const imgData = images[i];

    doc.addPage();
    drawBlackPage(doc);
    y = margin;

    // Top accent line
    doc.setFillColor(rankColors[i]);
    doc.rect(margin, y, contentW, 0.8, "F");
    y += 6;

    // Small header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(c.textMuted);
    doc.text("RAUMVOTE", margin, y);
    doc.text(`${opt.rank} / ${data.top5.length}`, pw - margin, y, { align: "right" });
    y += 8;

    // Rank badge
    doc.setFillColor(rankColors[i]);
    doc.roundedRect(margin, y, 22, 10, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text(`#${opt.rank}`, margin + 11, y + 7, { align: "center" });

    // Stats next to badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(c.textSecondary);
    doc.text(`${opt.votes} Stimmen  ·  ${opt.likes} Likes  ·  ${opt.comments} Kommentare`, margin + 26, y + 7);
    y += 18;

    // ── Title + Image row ──
    const titleStartY = y;
    const textX = margin;

    // Title (left side, full width above image area if needed)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(c.white);
    const optTitleLines = doc.splitTextToSize(opt.titel, textAreaW);
    doc.text(optTitleLines, textX, y + 6);
    y += optTitleLines.length * 8 + 6;

    // Image on the right side
    const imgX = pw - margin - imgW;
    const imgY = titleStartY;

    // Image card background
    doc.setFillColor(c.cardBg);
    doc.roundedRect(imgX - 2, imgY - 2, imgW + 4, imgH + 4, 4, 4, "F");

    if (imgData) {
      try {
        doc.addImage(imgData, "JPEG", imgX, imgY, imgW, imgH);
        // Rounded corner overlay (clip simulation with corner fills)
        const cr = 3;
        doc.setFillColor("#000000");
        // Top-left corner mask
        doc.rect(imgX, imgY, cr, cr, "F");
        doc.setFillColor(c.cardBg);
        doc.circle(imgX + cr, imgY + cr, cr, "F");
        // Top-right corner mask
        doc.setFillColor("#000000");
        doc.rect(imgX + imgW - cr, imgY, cr, cr, "F");
        doc.setFillColor(c.cardBg);
        doc.circle(imgX + imgW - cr, imgY + cr, cr, "F");
        // Bottom-left corner mask
        doc.setFillColor("#000000");
        doc.rect(imgX, imgY + imgH - cr, cr, cr, "F");
        doc.setFillColor(c.cardBg);
        doc.circle(imgX + cr, imgY + imgH - cr, cr, "F");
        // Bottom-right corner mask
        doc.setFillColor("#000000");
        doc.rect(imgX + imgW - cr, imgY + imgH - cr, cr, cr, "F");
        doc.setFillColor(c.cardBg);
        doc.circle(imgX + imgW - cr, imgY + imgH - cr, cr, "F");
      } catch {
        // Image failed — show placeholder
        doc.setFillColor(c.cardBg);
        doc.roundedRect(imgX, imgY, imgW, imgH, 3, 3, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(c.textMuted);
        doc.text("Kein Bild", imgX + imgW / 2, imgY + imgH / 2, { align: "center" });
      }
    } else {
      doc.setFillColor(c.cardBg);
      doc.roundedRect(imgX, imgY, imgW, imgH, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(c.textMuted);
      doc.text("Kein Bild", imgX + imgW / 2, imgY + imgH / 2, { align: "center" });
    }

    // Make sure y is below the image
    y = Math.max(y, imgY + imgH + 8);

    // Vote percentage bar (full width)
    const fullBarY = y;
    doc.setFillColor(c.barBg);
    doc.roundedRect(margin, fullBarY, contentW, 6, 3, 3, "F");
    if (opt.percentage > 0) {
      doc.setFillColor(rankColors[i]);
      doc.roundedRect(margin, fullBarY, Math.max(6, contentW * (opt.percentage / 100)), 6, 3, 3, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(c.white);
    doc.text(`${opt.percentage}%`, margin + contentW * (opt.percentage / 100) + 4, fullBarY + 4.5);
    y = fullBarY + 14;

    // Divider
    doc.setFillColor(c.cardBorder);
    doc.rect(margin, y, contentW, 0.3, "F");
    y += 10;

    // Description card
    doc.setFillColor(c.cardBg);
    const descText = opt.beschreibung || "Keine Beschreibung vorhanden.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(descText, contentW - 20);
    const descCardH = descLines.length * 4.8 + 16;

    doc.roundedRect(margin, y, contentW, descCardH, 4, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(c.textMuted);
    doc.text("BESCHREIBUNG", margin + 10, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(c.textPrimary);
    doc.text(descLines, margin + 10, y + 15);
    y += descCardH + 6;

    // Context card (if present)
    if (opt.context && opt.context !== opt.beschreibung) {
      doc.setFillColor(c.cardBg);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const ctxLines = doc.splitTextToSize(opt.context, contentW - 20);
      const ctxCardH = Math.min(ctxLines.length, 8) * 4.5 + 16;
      const ctxTruncated = ctxLines.slice(0, 8);

      if (y + ctxCardH > ph - margin - 10) {
        doc.addPage();
        drawBlackPage(doc);
        y = margin;
      }

      doc.setFillColor(c.cardBg);
      doc.roundedRect(margin, y, contentW, ctxCardH, 4, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(c.textMuted);
      doc.text("KONTEXT", margin + 10, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(c.textSecondary);
      doc.text(ctxTruncated, margin + 10, y + 15);
      y += ctxCardH + 6;
    }
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawBlackPage(doc); // Ensure background stays black after potential resets

    // Re-render page content isn't needed — just add footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(c.textMuted);
    doc.text(`Seite ${p} von ${pageCount}`, pw / 2, ph - 8, { align: "center" });

    if (p === 1) {
      doc.setFontSize(7);
      doc.setTextColor(c.textMuted);
      doc.text(
        "Dieses Dokument dient als Grundlage für die Detailplanung durch das Architekturbüro.",
        pw / 2,
        ph - 13,
        { align: "center" },
      );
    }
  }

  // Download
  const filename = `RaumVote_Top5_${exportDate.replace(/\./g, "-")}.pdf`;
  doc.save(filename);
}
