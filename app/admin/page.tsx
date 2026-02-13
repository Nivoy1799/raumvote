"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

type Token = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [createLabel, setCreateLabel] = useState("");
  const [error, setError] = useState("");

  const headers = useCallback(
    () => ({ "content-type": "application/json", authorization: `Bearer ${secret}` }),
    [secret],
  );

  async function login() {
    setError("");
    const res = await fetch("/api/admin/tokens", { headers: { authorization: `Bearer ${secret}` } });
    if (res.ok) {
      sessionStorage.setItem("adminSecret", secret);
      setAuthed(true);
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } else {
      setError("Falsches Passwort");
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("adminSecret");
    if (saved) {
      setSecret(saved);
      fetch("/api/admin/tokens", { headers: { authorization: `Bearer ${saved}` } })
        .then((r) => { if (r.ok) { setAuthed(true); return r.json(); } return null; })
        .then((d) => { if (d) setTokens(d.tokens ?? []); });
    }
  }, []);

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/tokens", { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens ?? []);
    }
    setLoading(false);
  }

  async function createTokens() {
    setLoading(true);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ count: createCount, label: createLabel || null }),
    });
    if (res.ok) {
      setCreateLabel("");
      await reload();
    }
    setLoading(false);
  }

  async function toggleActive(t: Token) {
    await fetch("/api/admin/tokens", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    await reload();
  }

  async function deleteToken(t: Token) {
    if (!confirm(`Token "${t.label || t.token.slice(0, 8)}" wirklich loschen?`)) return;
    await fetch("/api/admin/tokens", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ id: t.id }),
    });
    await reload();
  }

  function loginUrl(token: string) {
    return `${window.location.origin}/login/${token}`;
  }

  async function copyUrl(token: string) {
    await navigator.clipboard.writeText(loginUrl(token));
  }

  async function downloadQR(t: Token) {
    const url = loginUrl(t.token);
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${t.label || t.token.slice(0, 8)}.png`;
    a.click();
  }

  async function downloadAllQR() {
    const active = tokens.filter((t) => t.active);
    for (const t of active) {
      await downloadQR(t);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // --- Login gate ---
  if (!authed) {
    return (
      <main style={s.shell}>
        <div style={s.center}>
          <div style={s.h1}>Admin</div>
          <div style={s.sub}>Bitte Admin-Passwort eingeben</div>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="ADMIN_SECRET"
            style={s.input}
            autoFocus
          />
          <button style={s.btn} onClick={login}>Login</button>
          {error && <div style={s.error}>{error}</div>}
        </div>
      </main>
    );
  }

  // --- Main admin view ---
  return (
    <main style={s.shell}>
      <div style={s.container}>
        <div style={s.h1}>Token-Verwaltung</div>
        <div style={s.sub}>{tokens.length} Tokens gesamt, {tokens.filter((t) => t.active).length} aktiv</div>

        {/* Create tokens */}
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

        {/* Actions */}
        <div style={s.row}>
          <button style={s.btnSmall} onClick={reload} disabled={loading}>
            Aktualisieren
          </button>
          <button style={s.btnSmall} onClick={downloadAllQR} disabled={loading || tokens.filter((t) => t.active).length === 0}>
            Alle QR-Codes herunterladen
          </button>
        </div>

        {/* Token list */}
        <section style={s.card}>
          <div style={s.cardTitle}>Tokens</div>
          {tokens.length === 0 ? (
            <div style={s.muted}>Keine Tokens vorhanden.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {tokens.map((t) => (
                <div key={t.id} style={{ ...s.tokenRow, opacity: t.active ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.tokenLabel}>{t.label || "—"}</div>
                    <div style={s.tokenCode}>{t.token.slice(0, 8)}...{t.token.slice(-6)}</div>
                    <div style={s.tokenMeta}>
                      {t.active ? "Aktiv" : "Gesperrt"} &middot; {new Date(t.createdAt).toLocaleDateString("de")}
                    </div>
                  </div>
                  <div style={s.tokenActions}>
                    <button style={s.btnTiny} onClick={() => copyUrl(t.token)} title="URL kopieren">
                      Link
                    </button>
                    <button style={s.btnTiny} onClick={() => downloadQR(t)} title="QR herunterladen">
                      QR
                    </button>
                    <button
                      style={{ ...s.btnTiny, background: t.active ? "rgba(255,59,92,0.2)" : "rgba(96,165,250,0.2)" }}
                      onClick={() => toggleActive(t)}
                    >
                      {t.active ? "Sperren" : "Aktivieren"}
                    </button>
                    <button
                      style={{ ...s.btnTiny, background: "rgba(255,59,92,0.3)" }}
                      onClick={() => deleteToken(t)}
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { position: "fixed", inset: 0, background: "black", color: "white", overflow: "auto", zIndex: 1 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 12, padding: 24 },
  container: { width: "min(700px, 100vw)", margin: "0 auto", padding: "18px 14px 110px" },
  h1: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 12, opacity: 0.7, marginTop: 4, marginBottom: 14 },

  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 900, marginBottom: 10 },
  muted: { opacity: 0.5, fontSize: 13 },

  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },

  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    fontSize: 14,
  },
  btn: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
  },
  btnSmall: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  btnTiny: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "5px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11,
  },
  error: { color: "#ff3b5c", fontSize: 13, fontWeight: 800 },

  tokenRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.2)",
  },
  tokenLabel: { fontWeight: 900, fontSize: 14 },
  tokenCode: { fontSize: 11, opacity: 0.6, fontFamily: "monospace", marginTop: 2 },
  tokenMeta: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  tokenActions: { display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap" },
};
