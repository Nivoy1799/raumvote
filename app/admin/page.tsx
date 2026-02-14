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

type Session = {
  id: string;
  treeId: string;
  treeVersion: string;
  title: string | null;
  status: string;
  durationDays: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [createLabel, setCreateLabel] = useState("");
  const [error, setError] = useState("");

  // Session create form
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionTreeId, setSessionTreeId] = useState("");
  const [sessionTreeVersion, setSessionTreeVersion] = useState("");
  const [sessionDuration, setSessionDuration] = useState(30);

  // Countdown
  const [now, setNow] = useState(Date.now());

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

  // Load sessions when authed
  useEffect(() => {
    if (!authed) return;
    reloadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Load tree meta for session form defaults
  useEffect(() => {
    if (!authed) return;
    fetch("/api/tree/active")
      .then((r) => r.json())
      .then((d) => {
        if (d?.treeId) setSessionTreeId(d.treeId);
        if (d?.version) setSessionTreeVersion(d.version);
      })
      .catch(() => {});
  }, [authed]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function reloadSessions() {
    const res = await fetch("/api/admin/session", { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
    }
  }

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

  async function downloadAnleitung(t: Token) {
    const url = loginUrl(t.token);
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    const res = await fetch("/anleitung.html");
    let html = await res.text();
    html = html.replace(
      '<div class="qr-placeholder">QR-Code</div>',
      `<img src="${qrDataUrl}" alt="QR-Code" style="width:160px;height:160px;border-radius:12px;" />`
    );
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `anleitung-${t.label || t.token.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadAllQR() {
    const active = tokens.filter((t) => t.active);
    for (const t of active) {
      await downloadAnleitung(t);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // --- Session actions ---
  async function createSession() {
    if (!sessionTreeId || !sessionTreeVersion) return;
    setLoading(true);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        treeId: sessionTreeId,
        treeVersion: sessionTreeVersion,
        title: sessionTitle || null,
        durationDays: sessionDuration,
      }),
    });
    if (res.ok) {
      setShowCreateSession(false);
      setSessionTitle("");
      await reloadSessions();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Fehler beim Erstellen");
    }
    setLoading(false);
  }

  async function sessionAction(id: string, action: string) {
    const confirmMsg: Record<string, string> = {
      start: "Abstimmung jetzt starten?",
      finish: "Abstimmung beenden? Es können keine Stimmen mehr abgegeben werden.",
      cancel: "Abstimmung abbrechen?",
    };
    if (confirmMsg[action] && !confirm(confirmMsg[action])) return;

    await fetch("/api/admin/session", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id, action }),
    });
    await reloadSessions();
  }

  async function deleteSession(id: string) {
    if (!confirm("Entwurf löschen?")) return;
    await fetch("/api/admin/session", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ id }),
    });
    await reloadSessions();
  }

  function formatCountdown(ms: number): string {
    if (ms <= 0) return "Abgelaufen";
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function sessionDeadline(sess: Session): Date | null {
    if (!sess.startedAt) return null;
    const d = new Date(sess.startedAt);
    d.setDate(d.getDate() + sess.durationDays);
    return d;
  }

  function sessionRemaining(sess: Session): number {
    const dl = sessionDeadline(sess);
    if (!dl) return 0;
    return Math.max(0, dl.getTime() - now);
  }

  const statusLabel: Record<string, string> = {
    draft: "Entwurf",
    active: "Aktiv",
    finished: "Beendet",
    cancelled: "Abgebrochen",
  };

  const statusColor: Record<string, string> = {
    draft: "rgba(255,255,255,0.6)",
    active: "rgba(96,165,250,1)",
    finished: "rgba(74,222,128,1)",
    cancelled: "rgba(255,59,92,0.8)",
  };

  // Current active or draft session
  const currentSession = sessions.find((s) => s.status === "active" || s.status === "draft") ?? null;
  const pastSessions = sessions.filter((s) => s.status === "finished" || s.status === "cancelled");

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
        <div style={s.h1}>Admin</div>
        <div style={s.sub}>Voting-Perioden &amp; Token-Verwaltung</div>

        {error && <div style={{ ...s.error, marginBottom: 12 }}>{error}</div>}

        {/* ===== VOTING SESSION SECTION ===== */}
        <section style={s.card}>
          <div style={s.cardTitle}>Voting-Periode</div>

          {!currentSession && !showCreateSession && (
            <div>
              <div style={s.muted}>Keine aktive Periode.</div>
              <button style={{ ...s.btn, marginTop: 10 }} onClick={() => setShowCreateSession(true)}>
                Neue Periode erstellen
              </button>
            </div>
          )}

          {showCreateSession && !currentSession && (
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Titel (optional)"
                style={s.input}
              />
              <div style={s.row}>
                <input value={sessionTreeId} onChange={(e) => setSessionTreeId(e.target.value)} placeholder="treeId" style={{ ...s.input, flex: 1 }} />
                <input value={sessionTreeVersion} onChange={(e) => setSessionTreeVersion(e.target.value)} placeholder="version" style={{ ...s.input, width: 80 }} />
              </div>
              <div style={s.row}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Dauer (Tage):</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Math.max(1, Number(e.target.value)))}
                  style={{ ...s.input, width: 70 }}
                />
              </div>
              <div style={s.row}>
                <button style={s.btn} onClick={createSession} disabled={loading || !sessionTreeId}>Erstellen</button>
                <button style={s.btnSmall} onClick={() => setShowCreateSession(false)}>Abbrechen</button>
              </div>
            </div>
          )}

          {currentSession && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ ...s.statusBadge, color: statusColor[currentSession.status] }}>
                  {statusLabel[currentSession.status]}
                </span>
                {currentSession.title && <span style={{ fontWeight: 800 }}>{currentSession.title}</span>}
              </div>

              <div style={s.sessionMeta}>
                {currentSession.treeId} • {currentSession.treeVersion} • {currentSession.durationDays} Tage
              </div>

              {currentSession.status === "active" && currentSession.startedAt && (
                <div style={s.countdown}>
                  {sessionRemaining(currentSession) > 0
                    ? `Noch ${formatCountdown(sessionRemaining(currentSession))}`
                    : "Zeit abgelaufen"}
                  <span style={s.deadlineText}>
                    Deadline: {sessionDeadline(currentSession)?.toLocaleDateString("de", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}

              <div style={{ ...s.row, marginTop: 10 }}>
                {currentSession.status === "draft" && (
                  <>
                    <button style={{ ...s.btnSmall, background: "rgba(96,165,250,0.2)" }} onClick={() => sessionAction(currentSession.id, "start")}>
                      Starten
                    </button>
                    <button style={{ ...s.btnSmall, background: "rgba(255,59,92,0.2)" }} onClick={() => deleteSession(currentSession.id)}>
                      Löschen
                    </button>
                  </>
                )}
                {currentSession.status === "active" && (
                  <>
                    <button style={{ ...s.btnSmall, background: "rgba(74,222,128,0.2)" }} onClick={() => sessionAction(currentSession.id, "finish")}>
                      Beenden
                    </button>
                    <button style={{ ...s.btnSmall, background: "rgba(255,59,92,0.2)" }} onClick={() => sessionAction(currentSession.id, "cancel")}>
                      Abbrechen
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {pastSessions.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>Vergangene Perioden</div>
              {pastSessions.map((sess) => (
                <div key={sess.id} style={{ ...s.sessionPast }}>
                  <span style={{ ...s.statusBadge, color: statusColor[sess.status] }}>
                    {statusLabel[sess.status]}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{sess.title || sess.treeId}</span>
                  <span style={{ opacity: 0.5, fontSize: 11 }}>
                    {sess.endedAt ? new Date(sess.endedAt).toLocaleDateString("de") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== TOKEN SECTION ===== */}
        <div style={{ ...s.h1, fontSize: 18, marginTop: 8 }}>Token-Verwaltung</div>
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
            Alle Anleitungen herunterladen
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
                    <button style={s.btnTiny} onClick={() => downloadAnleitung(t)} title="Anleitung mit QR herunterladen">
                      PDF
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

  statusBadge: { fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 },
  sessionMeta: { fontSize: 12, opacity: 0.6 },
  countdown: { marginTop: 8, fontSize: 18, fontWeight: 950, letterSpacing: -0.3 },
  deadlineText: { display: "block", fontSize: 11, opacity: 0.5, fontWeight: 600, marginTop: 2 },
  sessionPast: { display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)" },

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
