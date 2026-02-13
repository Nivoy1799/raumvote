"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode, faCamera, faImage } from "@fortawesome/free-solid-svg-icons";
import { Html5Qrcode } from "html5-qrcode";

export default function DeniedPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function extractToken(text: string): string | null {
    // Match /login/{token} in a URL
    const match = text.match(/\/login\/([a-f0-9-]{36})/i);
    if (match) return match[1];
    // If it's a bare UUID
    if (/^[a-f0-9-]{36}$/i.test(text.trim())) return text.trim();
    return null;
  }

  function handleResult(decoded: string) {
    const token = extractToken(decoded);
    if (token) {
      stopScanner();
      router.push(`/login/${token}`);
    } else {
      setError("Kein gültiger QR-Code erkannt.");
    }
  }

  async function startScanner() {
    setError("");
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleResult(decodedText),
        () => {} // ignore scan failures
      );
    } catch (err) {
      setError("Kamera konnte nicht geöffnet werden. Bitte Berechtigung erteilen oder ein Bild hochladen.");
      setScanning(false);
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      const scanner = new Html5Qrcode("qr-reader-file");
      const result = await scanner.scanFile(file, true);
      handleResult(result);
      scanner.clear();
    } catch {
      setError("QR-Code im Bild nicht erkannt. Bitte ein anderes Bild versuchen.");
    }
  }

  return (
    <main style={s.shell}>
      <div style={s.center}>
        <FontAwesomeIcon icon={faQrcode} style={{ fontSize: 56, opacity: 0.4, marginBottom: 20 }} />
        <div style={s.title}>Kein Zugang</div>
        <div style={s.sub}>Bitte scanne deinen QR-Code um teilzunehmen.</div>

        <div style={s.actions}>
          {!scanning ? (
            <button style={s.btn} onClick={startScanner}>
              <FontAwesomeIcon icon={faCamera} /> Kamera öffnen
            </button>
          ) : (
            <button style={s.btnStop} onClick={stopScanner}>
              Kamera schliessen
            </button>
          )}

          <button style={s.btnGhost} onClick={() => fileRef.current?.click()}>
            <FontAwesomeIcon icon={faImage} /> QR-Bild hochladen
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* Camera viewfinder */}
        <div
          id="qr-reader"
          style={{
            width: "min(320px, 85vw)",
            margin: "16px auto 0",
            borderRadius: 18,
            overflow: "hidden",
            display: scanning ? "block" : "none",
          }}
        />

        {/* Hidden element for file scanning */}
        <div id="qr-reader-file" style={{ display: "none" }} />
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { position: "fixed", inset: 0, background: "black", color: "white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, overflow: "auto" },
  center: { textAlign: "center", padding: 24, width: "100%", maxWidth: 400 },
  title: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 14, opacity: 0.7, marginTop: 10, lineHeight: 1.4 },

  actions: { display: "grid", gap: 10, marginTop: 24 },
  btn: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  btnStop: {
    border: "1px solid rgba(255,59,92,0.3)",
    background: "rgba(255,59,92,0.15)",
    color: "white",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
  },
  btnGhost: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  error: { color: "#ff3b5c", fontSize: 13, fontWeight: 800, marginTop: 14 },
};
