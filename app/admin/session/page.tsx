"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import { s } from "../styles";

export default function SessionPage() {
  const {
    currentSession, archivedSessions, headers, reloadSessions,
    loading, setLoading, saving, setSaving, error, setError, now, secret,
  } = useAdmin();

  // Create form
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTreeId, setSessionTreeId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionRootTitel, setSessionRootTitel] = useState("");
  const [sessionRootBeschreibung, setSessionRootBeschreibung] = useState("");
  const [sessionRootContext, setSessionRootContext] = useState("");
  const [sessionSystemPrompt, setSessionSystemPrompt] = useState("");
  const [sessionModelName, setSessionModelName] = useState("gpt-4o");

  // Edit form
  const [editPrompt, setEditPrompt] = useState("");
  const [editModel, setEditModel] = useState("gpt-4o");
  const [editImagePrompt, setEditImagePrompt] = useState("");
  const [editImageModel, setEditImageModel] = useState("gemini-2.0-flash-preview-image-generation");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Tree reset
  const [showResetTree, setShowResetTree] = useState(false);
  const [resetRootTitel, setResetRootTitel] = useState("");
  const [resetRootBeschreibung, setResetRootBeschreibung] = useState("");
  const [resetRootContext, setResetRootContext] = useState("");

  // Sync edit fields when currentSession changes
  useEffect(() => {
    if (!currentSession) return;
    setEditPrompt(currentSession.systemPrompt);
    setEditModel(currentSession.modelName);
    setEditImagePrompt(currentSession.imagePrompt || "");
    setEditImageModel(currentSession.imageModel || "gemini-2.0-flash-preview-image-generation");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  async function createSession() {
    if (!sessionTreeId || !sessionRootTitel || !sessionRootBeschreibung) return;
    setLoading(true);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        treeId: sessionTreeId, title: sessionTitle || null, durationDays: sessionDuration,
        rootTitel: sessionRootTitel, rootBeschreibung: sessionRootBeschreibung,
        rootContext: sessionRootContext, systemPrompt: sessionSystemPrompt, modelName: sessionModelName,
      }),
    });
    if (res.ok) {
      setShowCreateSession(false);
      setSessionTreeId(""); setSessionTitle(""); setSessionRootTitel("");
      setSessionRootBeschreibung(""); setSessionRootContext(""); setSessionSystemPrompt("");
      setSessionModelName("gpt-4o");
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
      archive: "Abstimmung archivieren? Es können keine Stimmen mehr abgegeben werden.",
    };
    if (confirmMsg[action] && !confirm(confirmMsg[action])) return;
    await fetch("/api/admin/session", { method: "PATCH", headers: headers(), body: JSON.stringify({ id, action }) });
    await reloadSessions();
  }

  async function deleteSession(id: string) {
    if (!confirm("Entwurf löschen?")) return;
    await fetch("/api/admin/session", { method: "DELETE", headers: headers(), body: JSON.stringify({ id }) });
    await reloadSessions();
  }

  async function saveSessionConfig() {
    if (!currentSession) return;
    setSaving(true);
    await fetch("/api/admin/session", {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ id: currentSession.id, systemPrompt: editPrompt, modelName: editModel, imagePrompt: editImagePrompt, imageModel: editImageModel }),
    });
    await reloadSessions();
    setSaving(false);
  }

  async function toggleDiscovery() {
    if (!currentSession) return;
    setSaving(true);
    await fetch("/api/admin/session", {
      method: "PATCH", headers: headers(),
      body: JSON.stringify({ id: currentSession.id, discoveryEnabled: !currentSession.discoveryEnabled }),
    });
    await reloadSessions();
    setSaving(false);
  }

  async function uploadMedia(file: File) {
    if (!currentSession) return;
    setUploadingMedia(true);
    const form = new FormData();
    form.append("sessionId", currentSession.id);
    form.append("file", file);
    await fetch("/api/admin/session/media", { method: "POST", headers: { authorization: `Bearer ${secret}` }, body: form });
    await reloadSessions();
    setUploadingMedia(false);
  }

  async function removeMedia(url: string) {
    if (!currentSession) return;
    setUploadingMedia(true);
    await fetch("/api/admin/session/media", { method: "DELETE", headers: headers(), body: JSON.stringify({ sessionId: currentSession.id, url }) });
    await reloadSessions();
    setUploadingMedia(false);
  }

  async function resetTree() {
    if (!currentSession || !resetRootTitel || !resetRootBeschreibung) return;
    if (!confirm(`Wirklich den kompletten Baum "${currentSession.title || currentSession.treeId}" zurücksetzen? Alle Knoten werden gelöscht!`)) return;
    setSaving(true);
    const res = await fetch("/api/admin/tree-reset", {
      method: "POST",
      headers: { "x-admin-secret": secret, "content-type": "application/json" },
      body: JSON.stringify({ sessionId: currentSession.id, rootTitel: resetRootTitel, rootBeschreibung: resetRootBeschreibung, rootContext: resetRootContext }),
    });
    if (res.ok) {
      setShowResetTree(false); setResetRootTitel(""); setResetRootBeschreibung(""); setResetRootContext("");
      await reloadSessions();
      setError("");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Fehler beim Zurücksetzen");
    }
    setSaving(false);
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

  function sessionDeadline(sess: typeof currentSession): Date | null {
    if (!sess?.startedAt) return null;
    const d = new Date(sess.startedAt);
    d.setDate(d.getDate() + sess.durationDays);
    return d;
  }

  function sessionRemaining(sess: typeof currentSession): number {
    const dl = sessionDeadline(sess);
    if (!dl) return 0;
    return Math.max(0, dl.getTime() - now);
  }

  const statusLabel: Record<string, string> = { draft: "Entwurf", active: "Aktiv", archived: "Archiviert" };
  const statusColor: Record<string, string> = { draft: "rgba(255,255,255,0.6)", active: "rgba(96,165,250,1)", archived: "rgba(74,222,128,1)" };

  return (
    <section style={s.card}>
      <div style={s.cardTitle}>Session</div>

      {!currentSession && !showCreateSession && (
        <div>
          <div style={s.muted}>Keine aktive Session.</div>
          <button style={{ ...s.btn, marginTop: 10 }} onClick={() => setShowCreateSession(true)}>Neue Session erstellen</button>
        </div>
      )}

      {showCreateSession && !currentSession && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={s.row}>
            <input value={sessionTreeId} onChange={(e) => setSessionTreeId(e.target.value)} placeholder="Tree ID (z.B. dream-v2)" style={{ ...s.input, flex: 1 }} />
            <input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="Titel (optional)" style={{ ...s.input, flex: 1 }} />
          </div>
          <div style={s.row}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Dauer (Tage):</span>
            <input type="number" min={1} max={365} value={sessionDuration} onChange={(e) => setSessionDuration(Math.max(1, Number(e.target.value)))} style={{ ...s.input, width: 70 }} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800, marginTop: 4 }}>Root-Knoten</div>
          <input value={sessionRootTitel} onChange={(e) => setSessionRootTitel(e.target.value)} placeholder="Titel (max 2 Wörter)" style={s.input} />
          <input value={sessionRootBeschreibung} onChange={(e) => setSessionRootBeschreibung(e.target.value)} placeholder="Beschreibung (Stichworte)" style={s.input} />
          <textarea value={sessionRootContext} onChange={(e) => setSessionRootContext(e.target.value)} placeholder="Kontext (Szenenbeschreibung)" rows={3} style={{ ...s.input, resize: "vertical" as const }} />
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800, marginTop: 4 }}>AI-Konfiguration</div>
          <textarea value={sessionSystemPrompt} onChange={(e) => setSessionSystemPrompt(e.target.value)} placeholder="System-Prompt für AI-Generierung..." rows={5} style={{ ...s.input, resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }} />
          <div style={s.row}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Modell:</span>
            <select value={sessionModelName} onChange={(e) => setSessionModelName(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            </select>
          </div>
          <div style={s.row}>
            <button style={s.btn} onClick={createSession} disabled={loading || !sessionTreeId || !sessionRootTitel || !sessionRootBeschreibung}>Erstellen</button>
            <button style={s.btnSmall} onClick={() => setShowCreateSession(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {currentSession && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...s.statusBadge, color: statusColor[currentSession.status] }}>{statusLabel[currentSession.status]}</span>
            <span style={{ fontWeight: 900, fontSize: 14 }}>{currentSession.title || currentSession.treeId}</span>
            <span style={{ fontSize: 11, opacity: 0.5 }}>{currentSession.treeId}</span>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.7, flexWrap: "wrap" }}>
            <span>{currentSession._count.nodes} Knoten</span>
            <span>{currentSession._count.votes} Stimmen</span>
            <span>{currentSession._count.likes} Likes</span>
            <span>{currentSession._count.comments} Kommentare</span>
            <span>{currentSession.durationDays} Tage</span>
          </div>

          {currentSession.status === "active" && currentSession.startedAt && (
            <div style={s.countdown}>
              {sessionRemaining(currentSession) > 0 ? `Noch ${formatCountdown(sessionRemaining(currentSession))}` : "Zeit abgelaufen"}
              <span style={s.deadlineText}>
                Deadline: {sessionDeadline(currentSession)?.toLocaleDateString("de", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          <div style={{ ...s.row, marginTop: 0 }}>
            {currentSession.status === "draft" && (
              <>
                <button style={{ ...s.btnSmall, background: "rgba(96,165,250,0.2)" }} onClick={() => sessionAction(currentSession.id, "start")}>Starten</button>
                <button style={{ ...s.btnSmall, background: "rgba(255,59,92,0.2)" }} onClick={() => deleteSession(currentSession.id)}>Löschen</button>
              </>
            )}
            {currentSession.status === "active" && (
              <button style={{ ...s.btnSmall, background: "rgba(74,222,128,0.2)" }} onClick={() => sessionAction(currentSession.id, "archive")}>Archivieren</button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={toggleDiscovery} disabled={saving} style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
              background: currentSession.discoveryEnabled ? "rgba(52,199,89,0.8)" : "rgba(255,255,255,0.15)", transition: "background 0.2s",
            }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: currentSession.discoveryEnabled ? 23 : 3, transition: "left 0.2s" }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 800 }}>Entdeckung {currentSession.discoveryEnabled ? "aktiv" : "pausiert"}</span>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>Node: System-Prompt</div>
            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={6} style={{ ...s.input, width: "100%", resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>Bild: System-Prompt</div>
            <textarea value={editImagePrompt} onChange={(e) => setEditImagePrompt(e.target.value)} rows={4} placeholder="Optionaler System-Prompt für Bildgenerierung..." style={{ ...s.input, width: "100%", resize: "vertical" as const, fontFamily: "monospace", fontSize: 12 }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 4 }}>Referenzmaterial</div>
            {currentSession.referenceMedia.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {currentSession.referenceMedia.map((url) => (
                  <div key={url} style={{ position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 10, opacity: 0.5, background: "rgba(255,255,255,0.05)" }}>{url.split(".").pop()?.toUpperCase()}</div>
                    )}
                    <button onClick={() => removeMedia(url)} disabled={uploadingMedia} style={{
                      position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none",
                      background: "rgba(255,59,92,0.9)", color: "white", fontSize: 10, fontWeight: 900, cursor: "pointer", display: "grid", placeItems: "center", lineHeight: 1,
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{
              display: "inline-block", padding: "6px 12px", fontSize: 12, fontWeight: 700, borderRadius: 8,
              border: "1px dashed rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)",
              cursor: uploadingMedia ? "wait" : "pointer", opacity: uploadingMedia ? 0.5 : 1,
            }}>
              {uploadingMedia ? "Hochladen..." : "+ Datei hinzufügen"}
              <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMedia(file); e.target.value = ""; }} />
            </label>
          </div>

          <div style={s.row}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Text-Modell:</span>
            <select value={editModel} onChange={(e) => setEditModel(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            </select>
          </div>

          <div style={s.row}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Bild-Modell:</span>
            <select value={editImageModel} onChange={(e) => setEditImageModel(e.target.value)} style={{ ...s.input, cursor: "pointer" }}>
              <option value="gemini-2.0-flash-preview-image-generation">Gemini Flash (Image Gen)</option>
              <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
              <option value="hf:black-forest-labs/FLUX.1-schnell">HuggingFace FLUX Schnell</option>
            </select>
            <button style={s.btn} onClick={saveSessionConfig} disabled={saving}>Speichern</button>
          </div>

          {!showResetTree && (
            <button style={{ ...s.btnSmall, marginTop: 4, background: "rgba(255,59,92,0.15)", color: "rgba(255,59,92,0.9)", border: "1px solid rgba(255,59,92,0.3)" }} onClick={() => setShowResetTree(true)} disabled={saving}>
              Baum zurücksetzen (neue Abstimmung)
            </button>
          )}

          {showResetTree && (
            <div style={{ display: "grid", gap: 10, padding: 12, border: "1px solid rgba(255,59,92,0.2)", borderRadius: 14, background: "rgba(255,59,92,0.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "rgba(255,59,92,0.9)" }}>Baum zurücksetzen</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Dies löscht alle existierenden Knoten und erstellt einen neuen Root-Knoten.</div>
              <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800 }}>Neuer Root-Knoten</div>
              <input value={resetRootTitel} onChange={(e) => setResetRootTitel(e.target.value)} placeholder="Titel (max 2 Wörter)" style={s.input} />
              <input value={resetRootBeschreibung} onChange={(e) => setResetRootBeschreibung(e.target.value)} placeholder="Beschreibung (Stichworte)" style={s.input} />
              <textarea value={resetRootContext} onChange={(e) => setResetRootContext(e.target.value)} placeholder="Kontext (Szenenbeschreibung)" rows={3} style={{ ...s.input, resize: "vertical" as const }} />
              <div style={s.row}>
                <button style={{ ...s.btn, background: "rgba(255,59,92,0.8)", color: "white" }} onClick={resetTree} disabled={saving || !resetRootTitel || !resetRootBeschreibung}>Bestätigen & Zurücksetzen</button>
                <button style={s.btnSmall} onClick={() => { setShowResetTree(false); setResetRootTitel(""); setResetRootBeschreibung(""); setResetRootContext(""); }}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}

      {archivedSessions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>Archivierte Sessions</div>
          {archivedSessions.map((sess) => (
            <div key={sess.id} style={s.sessionPast}>
              <span style={{ ...s.statusBadge, color: statusColor[sess.status] }}>{statusLabel[sess.status]}</span>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{sess.title || sess.treeId}</span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>{sess._count.nodes} Knoten · {sess._count.votes} Stimmen</span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>{sess.endedAt ? new Date(sess.endedAt).toLocaleDateString("de") : "\u2014"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
