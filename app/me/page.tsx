"use client";

import { useEffect, useMemo, useState } from "react";

export default function MePage() {
  const [voterId, setVoterId] = useState("");
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let id = localStorage.getItem("voterId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("voterId", id);
    }
    setVoterId(id);
  }, []);

  useEffect(() => {
    if (!voterId) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/me?voterId=${encodeURIComponent(voterId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setUsername((data?.username ?? "").toString());
      setLoading(false);
    })();
  }, [voterId]);

  const maskedId = useMemo(() => {
    if (!voterId) return "";
    return `${voterId.slice(0, 8)}…${voterId.slice(-6)}`;
  }, [voterId]);

  async function save() {
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voterId, username }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  }

  return (
    <main style={s.shell}>
      <div style={s.container}>
        <div style={s.h1}>Profil</div>
        <div style={s.sub}>Gespeichert wird nur ein Hash deiner lokalen ID (keine UUID in der DB).</div>

        <section style={s.card}>
          <div style={s.label}>Deine lokale ID</div>
          <div style={s.idRow}>
            <code style={s.code}>{maskedId || "—"}</code>
            <button
              style={s.iconBtn}
              onClick={async () => voterId && navigator.clipboard.writeText(voterId)}
              aria-label="Copy voterId"
              title="Copy"
            >
              ⧉
            </button>
          </div>

          <div style={{ height: 14 }} />

          <label style={s.label}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="z.B. Liam_14"
            maxLength={24}
            style={s.input}
            disabled={loading}
          />

          <div style={s.actions}>
            <button style={s.btn} onClick={save} disabled={!voterId || loading}>
              Speichern
            </button>
            {saved && <div style={s.ok}>Saved ✓</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { position: "fixed", inset: 0, background: "black", color: "white", overflow: "hidden", zIndex: 1 },
  container: { width: "min(560px, 100vw)", margin: "0 auto", padding: "18px 14px 110px" },
  h1: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 12, opacity: 0.7, marginTop: 6, lineHeight: 1.35 },

  card: {
    marginTop: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    backdropFilter: "blur(14px)",
  },

  label: { fontSize: 12, opacity: 0.75, fontWeight: 850 },
  idRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 },
  code: {
    display: "inline-flex",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    overflow: "hidden",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  },

  input: {
    marginTop: 8,
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    fontSize: 14,
    fontWeight: 750,
  },

  actions: { marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  btn: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 900,
  },
  ok: { fontSize: 12, opacity: 0.85 },
};
