"use client";

import { useState } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAdmin } from "../AdminContext";
import { s } from "../styles";

export default function TokensPage() {
  const { tokens, setTokens, headers, loading, setLoading, reloadTokens } = useAdmin();

  const [createCount, setCreateCount] = useState(1);
  const [createLabel, setCreateLabel] = useState("");
  const [tokenFilterLabel, setTokenFilterLabel] = useState("");
  const [tokenFilterStatus, setTokenFilterStatus] = useState<"" | "active" | "inactive">("");
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenPageSize] = useState(50);

  async function createTokens() {
    setLoading(true);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ count: createCount, label: createLabel || null }),
    });
    if (res.ok) {
      setCreateLabel("");
      await reloadTokens();
    }
    setLoading(false);
  }

  async function toggleActive(t: { id: string; active: boolean }) {
    await fetch("/api/admin/tokens", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    await reloadTokens();
  }

  async function deleteToken(t: { id: string; label: string | null; token: string }) {
    if (!confirm(`Token "${t.label || t.token.slice(0, 8)}" wirklich loschen?`)) return;
    await fetch("/api/admin/tokens", { method: "DELETE", headers: headers(), body: JSON.stringify({ id: t.id }) });
    await reloadTokens();
  }

  function loginUrl(token: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://raumvote.ch";
    return `${base}/login/${token}`;
  }

  async function copyUrl(token: string) {
    await navigator.clipboard.writeText(loginUrl(token));
  }

  async function downloadAnleitung(t: { token: string; label: string | null }) {
    const url = loginUrl(t.token);
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    const res = await fetch("/anleitung.html");
    let html = await res.text();
    html = html.replace(
      '<div class="qr-placeholder">QR-Code</div>',
      `<img src="${qrDataUrl}" alt="QR-Code" style="width:160px;height:160px;border-radius:12px;" />`,
    );

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      width: 794,
      windowWidth: 794,
      backgroundColor: "#ffffff",
    });
    document.body.removeChild(iframe);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const scaledHeight = (canvas.height * pdfWidth) / canvas.width;
    const totalPages = Math.ceil(scaledHeight / pdfPageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const sliceCanvas = document.createElement("canvas");
      const sourceY = Math.round(page * (canvas.height / totalPages));
      const sourceH = Math.min(Math.round(canvas.height / totalPages), canvas.height - sourceY);
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sourceH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);
      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
      const sliceH = (sourceH * pdfWidth) / canvas.width;
      pdf.addImage(sliceData, "JPEG", 0, 0, pdfWidth, sliceH);
    }

    pdf.save(`anleitung-${t.label || t.token.slice(0, 8)}.pdf`);
  }

  async function downloadAllQR() {
    const active = tokens.filter((t) => t.active);
    for (const t of active) {
      await downloadAnleitung(t);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const filtered = tokens.filter((t) => {
    if (
      tokenFilterLabel &&
      !(t.label || "").toLowerCase().includes(tokenFilterLabel.toLowerCase()) &&
      !t.token.toLowerCase().includes(tokenFilterLabel.toLowerCase())
    )
      return false;
    if (tokenFilterStatus === "active" && !t.active) return false;
    if (tokenFilterStatus === "inactive" && t.active) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / tokenPageSize);
  const paginated = filtered.slice((tokenPage - 1) * tokenPageSize, tokenPage * tokenPageSize);

  return (
    <>
      <div style={{ ...s.h1, fontSize: 18, marginTop: 8 }}>Token-Verwaltung</div>
      <div style={s.sub}>
        {tokens.length} Tokens gesamt, {tokens.filter((t) => t.active).length} aktiv
      </div>

      <section style={s.card}>
        <div style={s.cardTitle}>Neue Tokens erstellen</div>
        <div style={s.row}>
          <input
            type="number"
            min={1}
            max={100}
            value={createCount}
            onChange={(e) => setCreateCount(Math.max(1, Number(e.target.value)))}
            style={{ ...s.input, width: 70 }}
          />
          <input
            value={createLabel}
            onChange={(e) => setCreateLabel(e.target.value)}
            placeholder="Label (optional)"
            style={{ ...s.input, flex: 1 }}
          />
          <button style={s.btn} onClick={createTokens} disabled={loading}>
            Erstellen
          </button>
        </div>
      </section>

      <div style={s.row}>
        <button style={s.btnSmall} onClick={reloadTokens} disabled={loading}>
          Aktualisieren
        </button>
        <button
          style={s.btnSmall}
          onClick={downloadAllQR}
          disabled={loading || tokens.filter((t) => t.active).length === 0}
        >
          Alle Anleitungen herunterladen
        </button>
      </div>

      <section style={s.card}>
        <div style={s.cardTitle}>Tokens</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={tokenFilterLabel}
            onChange={(e) => {
              setTokenFilterLabel(e.target.value);
              setTokenPage(1);
            }}
            placeholder="Label suchen..."
            style={{ ...s.input, fontSize: 12, padding: "6px 10px", flex: 1, minWidth: 120 }}
          />
          <select
            value={tokenFilterStatus}
            onChange={(e) => {
              setTokenFilterStatus(e.target.value as "" | "active" | "inactive");
              setTokenPage(1);
            }}
            style={{ ...s.input, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}
          >
            <option value="">Alle</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Gesperrt</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={s.muted}>Keine Tokens gefunden.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>{filtered.length} Tokens</div>
            <div style={{ display: "grid", gap: 8 }}>
              {paginated.map((t) => (
                <div key={t.id} style={{ ...s.tokenRow, opacity: t.active ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.tokenLabel}>{t.label || "\u2014"}</div>
                    <div style={s.tokenCode}>
                      {t.token.slice(0, 8)}...{t.token.slice(-6)}
                    </div>
                    <div style={s.tokenMeta}>
                      {t.active ? "Aktiv" : "Gesperrt"} &middot;{" "}
                      {new Date(t.createdAt).toLocaleDateString("de-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div style={s.tokenActions}>
                    <button style={s.btnTiny} onClick={() => copyUrl(t.token)} title="URL kopieren">
                      Link
                    </button>
                    <button
                      style={s.btnTiny}
                      onClick={() => downloadAnleitung(t)}
                      title="Anleitung mit QR herunterladen"
                    >
                      PDF
                    </button>
                    <button
                      style={{ ...s.btnTiny, background: t.active ? "rgba(255,59,92,0.2)" : "rgba(96,165,250,0.2)" }}
                      onClick={() => toggleActive(t)}
                    >
                      {t.active ? "Sperren" : "Aktivieren"}
                    </button>
                    <button style={{ ...s.btnTiny, background: "rgba(255,59,92,0.3)" }} onClick={() => deleteToken(t)}>
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
                <button
                  onClick={() => setTokenPage((p) => Math.max(1, p - 1))}
                  disabled={tokenPage <= 1}
                  style={{ ...s.btnTiny, opacity: tokenPage <= 1 ? 0.3 : 1 }}
                >
                  &larr;
                </button>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {tokenPage} / {totalPages}
                </span>
                <button
                  onClick={() => setTokenPage((p) => Math.min(totalPages, p + 1))}
                  disabled={tokenPage >= totalPages}
                  style={{ ...s.btnTiny, opacity: tokenPage >= totalPages ? 0.3 : 1 }}
                >
                  &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
