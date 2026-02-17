"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import { s } from "../styles";

type ImageTask = {
  id: string; nodeId: string; nodeTitel: string; status: string;
  error: string | null; imageUrl: string | null; createdAt: string;
  startedAt: string | null; completedAt: string | null;
};

type Stats = { pending: number; generating: number; completed: number; failed: number };

export default function ImagesPage() {
  const { currentSession, headers, saving, setSaving, setError } = useAdmin();

  const [imageTasks, setImageTasks] = useState<ImageTask[]>([]);
  const [imageTaskStats, setImageTaskStats] = useState<Stats>({ pending: 0, generating: 0, completed: 0, failed: 0 });
  const [imgPage, setImgPage] = useState(1);
  const [imgPageSize] = useState(50);
  const [imgTotal, setImgTotal] = useState(0);
  const [imgFilterStatus, setImgFilterStatus] = useState("");
  const [imgFilterTitle, setImgFilterTitle] = useState("");
  const [imgSort, setImgSort] = useState("createdAt");
  const [imgSortDir, setImgSortDir] = useState<"asc" | "desc">("desc");

  async function reloadImageTasks() {
    const sessionId = currentSession?.id;
    if (!sessionId) return;
    const params = new URLSearchParams({ sessionId, page: String(imgPage), pageSize: String(imgPageSize), sort: imgSort, sortDir: imgSortDir });
    if (imgFilterStatus) params.set("status", imgFilterStatus);
    if (imgFilterTitle) params.set("title", imgFilterTitle);
    const res = await fetch(`/api/admin/image-tasks?${params}`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setImageTasks(data.tasks ?? []);
      setImageTaskStats(data.stats ?? { pending: 0, generating: 0, completed: 0, failed: 0 });
      setImgTotal(data.total ?? 0);
    }
  }

  useEffect(() => {
    if (!currentSession) return;
    reloadImageTasks();
    const interval = setInterval(reloadImageTasks, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id, imgPage, imgFilterStatus, imgFilterTitle, imgSort, imgSortDir]);

  async function retryTask(taskId: string) {
    await fetch("/api/admin/image-tasks", { method: "POST", headers: headers(), body: JSON.stringify({ action: "retry", taskId }) });
    await reloadImageTasks();
  }

  async function retryAllFailed() {
    if (!currentSession) return;
    setSaving(true);
    const res = await fetch("/api/admin/image-tasks", { method: "POST", headers: headers(), body: JSON.stringify({ action: "retry-all-failed", sessionId: currentSession.id }) });
    if (!res.ok) { const data = await res.json().catch(() => null); setError(data?.error ?? "Retry fehlgeschlagen"); }
    await reloadImageTasks();
    setSaving(false);
  }

  async function restartPending() {
    if (!currentSession) return;
    setSaving(true);
    const res = await fetch("/api/admin/image-tasks", { method: "POST", headers: headers(), body: JSON.stringify({ action: "restart-pending", sessionId: currentSession.id }) });
    if (!res.ok) { const data = await res.json().catch(() => null); setError(data?.error ?? "Neustart fehlgeschlagen"); }
    await reloadImageTasks();
    setSaving(false);
  }

  async function backfillImages() {
    if (!currentSession) return;
    setSaving(true);
    const res = await fetch("/api/admin/image-tasks", { method: "POST", headers: headers(), body: JSON.stringify({ action: "backfill", sessionId: currentSession.id }) });
    if (!res.ok) { const data = await res.json().catch(() => null); setError(data?.error ?? "Backfill fehlgeschlagen"); }
    await reloadImageTasks();
    setSaving(false);
  }

  async function clearCompletedTasks() {
    if (!currentSession) return;
    await fetch("/api/admin/image-tasks", { method: "POST", headers: headers(), body: JSON.stringify({ action: "clear-completed", sessionId: currentSession.id }) });
    await reloadImageTasks();
  }

  if (!currentSession) {
    return <section style={s.card}><div style={s.muted}>Zuerst eine Session erstellen.</div></section>;
  }

  const statusColors: Record<string, string> = { pending: "rgba(255,200,50,0.9)", generating: "rgba(96,165,250,1)", completed: "rgba(52,199,89,0.9)", failed: "rgba(255,59,92,0.9)" };
  const statusLabels: Record<string, string> = { pending: "Wartend", generating: "Generiert...", completed: "Fertig", failed: "Fehler" };

  return (
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

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={imgFilterTitle} onChange={(e) => { setImgFilterTitle(e.target.value); setImgPage(1); }} placeholder="Titel suchen..." style={{ ...s.input, fontSize: 12, padding: "6px 10px", flex: 1, minWidth: 120 }} />
        <select value={imgFilterStatus} onChange={(e) => { setImgFilterStatus(e.target.value); setImgPage(1); }} style={{ ...s.input, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}>
          <option value="">Alle Status</option>
          <option value="pending">Wartend</option>
          <option value="generating">Generiert...</option>
          <option value="completed">Fertig</option>
          <option value="failed">Fehler</option>
        </select>
        <select value={imgSort} onChange={(e) => { setImgSort(e.target.value); setImgPage(1); }} style={{ ...s.input, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}>
          <option value="createdAt">Erstellt</option>
          <option value="status">Status</option>
          <option value="completedAt">Abgeschlossen</option>
          <option value="startedAt">Gestartet</option>
        </select>
        <button
          onClick={() => setImgSortDir((d) => d === "asc" ? "desc" : "asc")}
          style={{ ...s.btnTiny, fontSize: 14, padding: "4px 8px", minWidth: 28 }}
          title={imgSortDir === "asc" ? "Aufsteigend" : "Absteigend"}
        >
          {imgSortDir === "asc" ? "\u2191" : "\u2193"}
        </button>
        <span style={{ fontSize: 11, opacity: 0.5 }}>{imgTotal} Einträge</span>
      </div>

      {imageTasks.length === 0 ? (
        <div style={s.muted}>Keine Bildgenerierungs-Aufgaben.</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {imageTasks.map((task) => {
            const elapsed = task.startedAt && task.completedAt
              ? `${((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000).toFixed(0)}s`
              : task.startedAt ? `${((Date.now() - new Date(task.startedAt).getTime()) / 1000).toFixed(0)}s...` : null;
            const lastChanged = task.completedAt || task.startedAt || task.createdAt;
            return (
              <div key={task.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {task.imageUrl && task.status === "completed" ? (
                  <img src={task.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: task.status === "generating" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontSize: 14 }}>
                    {task.status === "generating" ? "..." : task.status === "failed" ? "!" : "~"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.nodeTitel}</div>
                  <div style={{ fontSize: 10, display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                    <span style={{ color: statusColors[task.status], fontWeight: 800 }}>{statusLabels[task.status]}</span>
                    {elapsed && <span style={{ opacity: 0.5 }}>{elapsed}</span>}
                    <span style={{ opacity: 0.4 }}>{new Date(lastChanged).toLocaleString("de", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    {task.error && <span style={{ color: "rgba(255,59,92,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.error.slice(0, 50)}</span>}
                  </div>
                </div>
                {task.status === "failed" && (
                  <button onClick={() => retryTask(task.id)} style={{ ...s.btnTiny, background: "rgba(96,165,250,0.2)", flexShrink: 0 }}>Retry</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {imgTotal > imgPageSize && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
          <button onClick={() => setImgPage((p) => Math.max(1, p - 1))} disabled={imgPage <= 1} style={{ ...s.btnTiny, opacity: imgPage <= 1 ? 0.3 : 1 }}>&larr;</button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{imgPage} / {Math.ceil(imgTotal / imgPageSize)}</span>
          <button onClick={() => setImgPage((p) => Math.min(Math.ceil(imgTotal / imgPageSize), p + 1))} disabled={imgPage >= Math.ceil(imgTotal / imgPageSize)} style={{ ...s.btnTiny, opacity: imgPage >= Math.ceil(imgTotal / imgPageSize) ? 0.3 : 1 }}>&rarr;</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={backfillImages} disabled={saving} style={{ ...s.btnSmall, background: "rgba(255,200,50,0.15)" }}>Fehlende Bilder generieren</button>
        {imageTaskStats.failed > 0 && (
          <button onClick={retryAllFailed} disabled={saving} style={{ ...s.btnSmall, background: "rgba(96,165,250,0.15)" }}>Alle fehlgeschlagenen wiederholen ({imageTaskStats.failed})</button>
        )}
        {imageTaskStats.pending > 0 && (
          <button onClick={restartPending} disabled={saving} style={{ ...s.btnSmall, background: "rgba(250,204,21,0.15)" }}>Wartende neu starten ({imageTaskStats.pending})</button>
        )}
        {imageTaskStats.completed > 0 && (
          <button onClick={clearCompletedTasks} style={{ ...s.btnSmall, opacity: 0.6 }}>Erledigte löschen ({imageTaskStats.completed})</button>
        )}
      </div>
    </section>
  );
}
