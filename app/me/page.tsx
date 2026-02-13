"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCamera } from "@fortawesome/free-solid-svg-icons";

export default function MePage() {
  const [voterId, setVoterId] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setAvatarUrl(data?.avatarUrl || null);
      setLoading(false);
    })();
  }, [voterId]);

  const maskedId = useMemo(() => {
    if (!voterId) return "";
    return `${voterId.slice(0, 8)}…${voterId.slice(-6)}`;
  }, [voterId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 160, 160);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voterId, username, avatarUrl }),
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
          <div style={s.avatarRow}>
            <button style={s.avatarWrap} onClick={() => fileRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={s.avatarImg} />
              ) : (
                <FontAwesomeIcon icon={faUser} style={{ fontSize: 32, color: "rgba(255,255,255,0.4)" }} />
              )}
              <div style={s.cameraBadge}>
                <FontAwesomeIcon icon={faCamera} style={{ fontSize: 11 }} />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>

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

  avatarRow: { display: "flex", justifyContent: "center", marginBottom: 14 },
  avatarWrap: {
    position: "relative" as const,
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    border: "2px solid rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    cursor: "pointer",
    padding: 0,
    color: "white",
  },
  avatarImg: { width: 80, height: 80, borderRadius: "50%", objectFit: "cover" as const },
  cameraBadge: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(96,165,250,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid black",
  },

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
