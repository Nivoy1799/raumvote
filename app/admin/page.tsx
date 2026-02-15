"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

  // Tree config
  const [treeConfig, setTreeConfig] = useState<{ treeId: string; rootNodeId: string | null; systemPrompt: string; modelName: string; title: string | null; discoveryEnabled: boolean; imageModel: string; imagePrompt: string | null; referenceMedia: string[] } | null>(null);
  const [treeStats, setTreeStats] = useState<{ totalNodes: number; maxDepth: number; undiscovered: number; pendingImages: number; withImages: number } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editModel, setEditModel] = useState("gpt-4o");
  const [editImagePrompt, setEditImagePrompt] = useState("");
  const [editImageModel, setEditImageModel] = useState("gemini-2.0-flash-preview-image-generation");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showCreateTree, setShowCreateTree] = useState(false);
  const [newTreeId, setNewTreeId] = useState("");
  const [newTreeTitle, setNewTreeTitle] = useState("");
  const [newRootTitel, setNewRootTitel] = useState("");
  const [newRootBeschreibung, setNewRootBeschreibung] = useState("");
  const [newRootContext, setNewRootContext] = useState("");
  const [newSystemPrompt, setNewSystemPrompt] = useState("");
  const [treeSaving, setTreeSaving] = useState(false);

  // Image tasks
  const [imageTasks, setImageTasks] = useState<{ id: string; nodeId: string; nodeTitel: string; status: string; error: string | null; imageUrl: string | null; createdAt: string; startedAt: string | null; completedAt: string | null }[]>([]);
  const [imageTaskStats, setImageTaskStats] = useState<{ pending: number; generating: number; completed: number; failed: number }>({ pending: 0, generating: 0, completed: 0, failed: 0 });

  // Admin section navigation
  const [activeSection, setActiveSection] = useState<"session" | "tree" | "images" | "tokens">("session");

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
        setSessionTreeVersion("dynamic");
      })
      .catch(() => {});
  }, [authed]);

  // Load tree config
  useEffect(() => {
    if (!authed) return;
    reloadTreeConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Load image tasks + auto-refresh when generating
  useEffect(() => {
    if (!authed || !treeConfig) return;
    reloadImageTasks();
    const interval = setInterval(reloadImageTasks, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, treeConfig?.treeId]);

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
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://raumvote.ch";
    return `${base}/login/${token}`;
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

    // Render HTML in hidden iframe, capture to PDF
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for images (QR code) to load
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

    // Scale canvas to fit A4 width, then slice into pages
    const scaledHeight = (canvas.height * pdfWidth) / canvas.width;
    const totalPages = Math.ceil(scaledHeight / pdfPageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Crop a page-sized slice from the canvas
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

  // --- Image task queue ---
  async function reloadImageTasks() {
    const treeId = treeConfig?.treeId;
    if (!treeId) return;
    const res = await fetch(`/api/admin/image-tasks?treeId=${treeId}`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setImageTasks(data.tasks ?? []);
      setImageTaskStats(data.stats ?? { pending: 0, generating: 0, completed: 0, failed: 0 });
    }
  }

  async function retryTask(taskId: string) {
    await fetch("/api/admin/image-tasks", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "retry", taskId }),
    });
    await reloadImageTasks();
  }

  async function retryAllFailed() {
    if (!treeConfig) return;
    setTreeSaving(true);
    const res = await fetch("/api/admin/image-tasks", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "retry-all-failed", treeId: treeConfig.treeId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Retry fehlgeschlagen");
    }
    await reloadImageTasks();
    setTreeSaving(false);
  }

  async function restartPending() {
    if (!treeConfig) return;
    setTreeSaving(true);
    const res = await fetch("/api/admin/image-tasks", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "restart-pending", treeId: treeConfig.treeId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Neustart fehlgeschlagen");
    }
    await reloadImageTasks();
    setTreeSaving(false);
  }

  async function backfillImages() {
    if (!treeConfig) return;
    setTreeSaving(true);
    const res = await fetch("/api/admin/image-tasks", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "backfill", treeId: treeConfig.treeId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Backfill fehlgeschlagen");
    }
    await reloadImageTasks();
    setTreeSaving(false);
  }

  async function clearCompletedTasks() {
    if (!treeConfig) return;
    await fetch("/api/admin/image-tasks", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "clear-completed", treeId: treeConfig.treeId }),
    });
    await reloadImageTasks();
  }

  // --- Tree config actions ---
  async function reloadTreeConfig() {
    const res = await fetch("/api/admin/tree-config", { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        setTreeConfig(data.config);
        setEditPrompt(data.config.systemPrompt);
        setEditModel(data.config.modelName);
        setEditImagePrompt(data.config.imagePrompt || "");
        setEditImageModel(data.config.imageModel || "gemini-2.0-flash-preview-image-generation");
        setTreeStats(data.stats ?? null);
      } else {
        setTreeConfig(null);
        setTreeStats(null);
      }
    }
  }

  async function saveTreePrompt() {
    if (!treeConfig) return;
    setTreeSaving(true);
    await fetch("/api/admin/tree-config", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ treeId: treeConfig.treeId, systemPrompt: editPrompt, modelName: editModel, imagePrompt: editImagePrompt, imageModel: editImageModel }),
    });
    await reloadTreeConfig();
    setTreeSaving(false);
  }

  async function toggleDiscovery() {
    if (!treeConfig) return;
    setTreeSaving(true);
    await fetch("/api/admin/tree-config", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ treeId: treeConfig.treeId, discoveryEnabled: !treeConfig.discoveryEnabled }),
    });
    await reloadTreeConfig();
    setTreeSaving(false);
  }

  async function uploadMedia(file: File) {
    if (!treeConfig) return;
    setUploadingMedia(true);
    const form = new FormData();
    form.append("treeId", treeConfig.treeId);
    form.append("file", file);
    await fetch("/api/admin/tree-config/media", { method: "POST", headers: { authorization: `Bearer ${secret}` }, body: form });
    await reloadTreeConfig();
    setUploadingMedia(false);
  }

  async function removeMedia(url: string) {
    if (!treeConfig) return;
    setUploadingMedia(true);
    await fetch("/api/admin/tree-config/media", {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ treeId: treeConfig.treeId, url }),
    });
    await reloadTreeConfig();
    setUploadingMedia(false);
  }

  async function createTree() {
    if (!newTreeId || !newRootTitel || !newRootBeschreibung || !newRootContext || !newSystemPrompt) return;
    setTreeSaving(true);
    const res = await fetch("/api/admin/tree-config", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        treeId: newTreeId,
        title: newTreeTitle || null,
        rootTitel: newRootTitel,
        rootBeschreibung: newRootBeschreibung,
        rootContext: newRootContext,
        systemPrompt: newSystemPrompt,
      }),
    });
    if (res.ok) {
      setShowCreateTree(false);
      setNewTreeId("");
      setNewTreeTitle("");
      setNewRootTitel("");
      setNewRootBeschreibung("");
      setNewRootContext("");
      setNewSystemPrompt("");
      await reloadTreeConfig();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Fehler beim Erstellen");
    }
    setTreeSaving(false);
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
  const sections = [
    { key: "session" as const, label: "Periode" },
    { key: "tree" as const, label: "Baum" },
    { key: "images" as const, label: "Bilder" },
    { key: "tokens" as const, label: "Tokens" },
  ];

  return (
    <main style={s.shell}>
      {/* Section tab bar */}
      <nav style={s.tabBar}>
        {sections.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            style={{
              ...s.tabBtn,
              ...(activeSection === sec.key ? s.tabBtnActive : {}),
            }}
          >
            {sec.label}
          </button>
        ))}
      </nav>

      <div style={s.container}>
        {error && <div style={{ ...s.error, marginBottom: 12 }}>{error}</div>}

        {/* ===== VOTING SESSION SECTION ===== */}
        {activeSection === "session" && <section style={s.card}>
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
        </section>}

        {/* ===== TREE CONFIG SECTION ===== */}
        {activeSection === "tree" && <section style={s.card}>
          <div style={s.cardTitle}>AI-Entscheidungsbaum</div>

          {treeConfig ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 900, fontSize: 14 }}>{treeConfig.title || treeConfig.treeId}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{treeConfig.treeId}</span>
              </div>

              {treeStats && (
                <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.7, flexWrap: "wrap" }}>
                  <span>{treeStats.totalNodes} Knoten</span>
                  <span>Max Tiefe: {treeStats.maxDepth}</span>
                  <span>{treeStats.undiscovered} unentdeckt</span>
                  <span style={{ color: treeStats.pendingImages > 0 ? "rgba(255,200,50,0.9)" : "rgba(52,199,89,0.9)" }}>
                    {treeStats.pendingImages > 0
                      ? `${treeStats.pendingImages} Bilder ausstehend`
                      : `${treeStats.withImages} Bilder fertig`}
                  </span>
                </div>
              )}

              {/* Discovery toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={toggleDiscovery}
                  disabled={treeSaving}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    background: treeConfig.discoveryEnabled ? "rgba(52,199,89,0.8)" : "rgba(255,255,255,0.15)",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: 3,
                    left: treeConfig.discoveryEnabled ? 23 : 3,
                    transition: "left 0.2s",
                  }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  Entdeckung {treeConfig.discoveryEnabled ? "aktiv" : "pausiert"}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>System-Prompt</div>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={6}
                  style={{ ...s.input, width: "100%", resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>Bild-Prompt</div>
                <textarea
                  value={editImagePrompt}
                  onChange={(e) => setEditImagePrompt(e.target.value)}
                  rows={4}
                  placeholder="Optionaler System-Prompt für Bildgenerierung..."
                  style={{ ...s.input, width: "100%", resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }}
                />
              </div>

              {/* Reference media */}
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>Referenzmaterial</div>
                {treeConfig.referenceMedia.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    {treeConfig.referenceMedia.map((url) => (
                      <div key={url} style={{ position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 10, opacity: 0.5, background: "rgba(255,255,255,0.05)" }}>
                            {url.split(".").pop()?.toUpperCase()}
                          </div>
                        )}
                        <button
                          onClick={() => removeMedia(url)}
                          disabled={uploadingMedia}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(255,59,92,0.9)",
                            color: "white",
                            fontSize: 10,
                            fontWeight: 900,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "1px dashed rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.6)",
                  cursor: uploadingMedia ? "wait" : "pointer",
                  opacity: uploadingMedia ? 0.5 : 1,
                }}>
                  {uploadingMedia ? "Hochladen..." : "+ Datei hinzufügen"}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMedia(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div style={s.row}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Text-Modell:</span>
                <select
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  style={{ ...s.input, cursor: "pointer" }}
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </select>
              </div>

              <div style={s.row}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Bild-Modell:</span>
                <select
                  value={editImageModel}
                  onChange={(e) => setEditImageModel(e.target.value)}
                  style={{ ...s.input, cursor: "pointer" }}
                >
                  <option value="gemini-2.0-flash-preview-image-generation">Gemini Flash (Image Gen)</option>
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                  <option value="hf:black-forest-labs/FLUX.1-schnell">HuggingFace FLUX Schnell</option>
                </select>
                <button style={s.btn} onClick={saveTreePrompt} disabled={treeSaving}>
                  Speichern
                </button>
              </div>
            </div>
          ) : (
            <div style={s.muted}>Kein Baum konfiguriert.</div>
          )}

          {!showCreateTree ? (
            <button style={{ ...s.btnSmall, marginTop: 10 }} onClick={() => setShowCreateTree(true)}>
              Neuen Baum erstellen
            </button>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12, padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>Neuen Baum erstellen</div>
              <div style={s.row}>
                <input value={newTreeId} onChange={(e) => setNewTreeId(e.target.value)} placeholder="Tree ID (z.B. dream-v2)" style={{ ...s.input, flex: 1 }} />
                <input value={newTreeTitle} onChange={(e) => setNewTreeTitle(e.target.value)} placeholder="Titel (optional)" style={{ ...s.input, flex: 1 }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800 }}>Root-Knoten</div>
              <input value={newRootTitel} onChange={(e) => setNewRootTitel(e.target.value)} placeholder="Titel (max 2 Wörter)" style={s.input} />
              <input value={newRootBeschreibung} onChange={(e) => setNewRootBeschreibung(e.target.value)} placeholder="Beschreibung (Stichworte)" style={s.input} />
              <textarea value={newRootContext} onChange={(e) => setNewRootContext(e.target.value)} placeholder="Kontext (Szenenbeschreibung)" rows={3} style={{ ...s.input, resize: "vertical" as const }} />
              <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800 }}>System-Prompt</div>
              <textarea value={newSystemPrompt} onChange={(e) => setNewSystemPrompt(e.target.value)} placeholder="Prompt für die AI-Generierung..." rows={5} style={{ ...s.input, resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }} />
              <div style={s.row}>
                <button style={s.btn} onClick={createTree} disabled={treeSaving || !newTreeId || !newRootTitel || !newRootBeschreibung || !newRootContext || !newSystemPrompt}>
                  Erstellen
                </button>
                <button style={s.btnSmall} onClick={() => setShowCreateTree(false)}>Abbrechen</button>
              </div>
            </div>
          )}
        </section>}

        {/* ===== IMAGE TASK QUEUE ===== */}
        {activeSection === "images" && !treeConfig && (
          <section style={s.card}><div style={s.muted}>Zuerst einen Baum unter &quot;Baum&quot; erstellen.</div></section>
        )}
        {activeSection === "images" && treeConfig && (
          <section style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={s.cardTitle}>Bildgenerierung</div>
              <div style={{ display: "flex", gap: 6, fontSize: 11, fontWeight: 800 }}>
                {imageTaskStats.generating > 0 && (
                  <span style={{ color: "rgba(96,165,250,1)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(96,165,250,1)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                    {imageTaskStats.generating} aktiv
                  </span>
                )}
                {imageTaskStats.pending > 0 && <span style={{ color: "rgba(255,200,50,0.9)" }}>{imageTaskStats.pending} wartend</span>}
                {imageTaskStats.failed > 0 && <span style={{ color: "rgba(255,59,92,0.9)" }}>{imageTaskStats.failed} fehlgeschlagen</span>}
                {imageTaskStats.completed > 0 && <span style={{ color: "rgba(52,199,89,0.9)" }}>{imageTaskStats.completed} fertig</span>}
              </div>
            </div>

            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

            {imageTasks.length === 0 ? (
              <div style={s.muted}>Keine Bildgenerierungs-Aufgaben.</div>
            ) : (
              <div style={{ display: "grid", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {imageTasks.map((task) => {
                  const statusColors: Record<string, string> = {
                    pending: "rgba(255,200,50,0.9)",
                    generating: "rgba(96,165,250,1)",
                    completed: "rgba(52,199,89,0.9)",
                    failed: "rgba(255,59,92,0.9)",
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "Wartend",
                    generating: "Generiert...",
                    completed: "Fertig",
                    failed: "Fehler",
                  };
                  const elapsed = task.startedAt && task.completedAt
                    ? `${((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000).toFixed(0)}s`
                    : task.startedAt
                    ? `${((Date.now() - new Date(task.startedAt).getTime()) / 1000).toFixed(0)}s...`
                    : null;

                  return (
                    <div key={task.id} style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {task.imageUrl && task.status === "completed" ? (
                        <img src={task.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                          background: task.status === "generating" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)",
                          display: "grid", placeItems: "center", fontSize: 14,
                        }}>
                          {task.status === "generating" ? "..." : task.status === "failed" ? "!" : "~"}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.nodeTitel}
                        </div>
                        <div style={{ fontSize: 10, display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                          <span style={{ color: statusColors[task.status], fontWeight: 800 }}>{statusLabels[task.status]}</span>
                          {elapsed && <span style={{ opacity: 0.5 }}>{elapsed}</span>}
                          {task.error && <span style={{ color: "rgba(255,59,92,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.error.slice(0, 50)}</span>}
                        </div>
                      </div>
                      {task.status === "failed" && (
                        <button
                          onClick={() => retryTask(task.id)}
                          style={{ ...s.btnTiny, background: "rgba(96,165,250,0.2)", flexShrink: 0 }}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button
                onClick={backfillImages}
                disabled={treeSaving}
                style={{ ...s.btnSmall, background: "rgba(255,200,50,0.15)" }}
              >
                Fehlende Bilder generieren
              </button>
              {imageTaskStats.failed > 0 && (
                <button
                  onClick={retryAllFailed}
                  disabled={treeSaving}
                  style={{ ...s.btnSmall, background: "rgba(96,165,250,0.15)" }}
                >
                  Alle fehlgeschlagenen wiederholen ({imageTaskStats.failed})
                </button>
              )}
              {imageTaskStats.pending > 0 && (
                <button
                  onClick={restartPending}
                  disabled={treeSaving}
                  style={{ ...s.btnSmall, background: "rgba(250,204,21,0.15)" }}
                >
                  Wartende neu starten ({imageTaskStats.pending})
                </button>
              )}
              {imageTaskStats.completed > 0 && (
                <button
                  onClick={clearCompletedTasks}
                  style={{ ...s.btnSmall, opacity: 0.6 }}
                >
                  Erledigte löschen ({imageTaskStats.completed})
                </button>
              )}
            </div>
          </section>
        )}

        {/* ===== TOKEN SECTION ===== */}
        {activeSection === "tokens" && <>
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
        </>}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { position: "fixed", inset: 0, background: "black", color: "white", overflow: "auto", zIndex: 1 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 12, padding: 24 },
  container: { width: "min(700px, 100vw)", margin: "0 auto", padding: "64px 14px 24px" },
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

  tabBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(18px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    zIndex: 50,
    padding: "0 12px",
  },
  tabBtn: {
    border: "none",
    background: "transparent",
    color: "white",
    opacity: 0.5,
    fontSize: 13,
    fontWeight: 800,
    padding: "8px 16px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "opacity 0.15s, border-color 0.15s",
  },
  tabBtnActive: {
    opacity: 1,
    borderBottomColor: "white",
  },
};
