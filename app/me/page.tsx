"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCamera } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/useAuth";
import { useResponsive } from "@/lib/useResponsive";

type LikedNode = {
  id: string;
  optionId: string;
  createdAt: string;
  node: { id: string; titel: string; beschreibung: string; mediaUrl: string | null; parentId: string | null; depth: number } | null;
};

export default function MePage() {
  const { voterId } = useAuth();
  const router = useRouter();
  const r = useResponsive();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [likedNodes, setLikedNodes] = useState<LikedNode[]>([]);
  const [likesLoading, setLikesLoading] = useState(true);

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
    // Fetch liked nodes
    (async () => {
      setLikesLoading(true);
      const res = await fetch(`/api/like/list?voterId=${encodeURIComponent(voterId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setLikedNodes(data?.likes ?? []);
      setLikesLoading(false);
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
      const img = new window.Image();
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

  const isLrg = r.breakpoint === "large";
  const avatarSize = isLrg ? 120 : 80;

  return (
    <main style={{ position: "fixed", inset: 0, background: "black", color: "white", overflow: "auto", zIndex: 1 }}>
      <div style={{ width: r.maxWidth, margin: "0 auto", padding: `${r.spacing.medium + 2}px ${r.spacing.medium}px ${r.tabbarHeight + r.spacing.large}px` }}>
        <div style={{ fontSize: r.fontSize.title + 3, fontWeight: 950, letterSpacing: -0.3 }}>Profil</div>
        <div style={{ fontSize: r.fontSize.small, opacity: 0.7, marginTop: 6, lineHeight: 1.35 }}>Gespeichert wird nur ein Hash deiner lokalen ID (keine UUID in der DB).</div>

        <section style={{ marginTop: r.spacing.medium, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: r.borderRadius.medium, padding: r.spacing.medium, backdropFilter: "blur(14px)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: r.spacing.medium }}>
            <button style={{ position: "relative" as const, width: avatarSize, height: avatarSize, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", cursor: "pointer", padding: 0, color: "white" }} onClick={() => fileRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover" as const }} />
              ) : (
                <FontAwesomeIcon icon={faUser} style={{ fontSize: isLrg ? 48 : 32, color: "rgba(255,255,255,0.4)" }} />
              )}
              <div style={{ position: "absolute" as const, bottom: -2, right: -2, width: isLrg ? 34 : 26, height: isLrg ? 34 : 26, borderRadius: "50%", background: "rgba(96,165,250,0.9)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid black" }}>
                <FontAwesomeIcon icon={faCamera} style={{ fontSize: isLrg ? 14 : 11 }} />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>

          <div style={{ fontSize: r.fontSize.small, opacity: 0.75, fontWeight: 850 }}>Deine lokale ID</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            <code style={{ display: "inline-flex", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.9)", fontSize: r.fontSize.small, overflow: "hidden" }}>{maskedId || "—"}</code>
            <button
              style={{ width: isLrg ? 48 : 40, height: isLrg ? 48 : 40, borderRadius: r.borderRadius.small, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer", fontWeight: 900, fontSize: r.fontSize.body }}
              onClick={async () => voterId && navigator.clipboard.writeText(voterId)}
              aria-label="Copy voterId"
              title="Copy"
            >
              ⧉
            </button>
          </div>

          <div style={{ height: r.spacing.medium }} />

          <label style={{ fontSize: r.fontSize.small, opacity: 0.75, fontWeight: 850 }}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="z.B. Liam_14"
            maxLength={24}
            style={{ marginTop: 8, width: "100%", padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "white", outline: "none", fontSize: r.fontSize.body, fontWeight: 750 }}
            disabled={loading}
          />

          <div style={{ marginTop: r.spacing.medium, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
            <button style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.10)", color: "white", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, cursor: "pointer", fontWeight: 900, fontSize: r.fontSize.body }} onClick={save} disabled={!voterId || loading}>
              Speichern
            </button>
            {saved && <div style={{ fontSize: r.fontSize.small, opacity: 0.85 }}>Saved ✓</div>}
          </div>
        </section>

        {/* Liked nodes */}
        <section style={{ marginTop: r.spacing.medium }}>
          <div style={{ fontSize: r.fontSize.title, fontWeight: 950, letterSpacing: -0.3, marginBottom: r.spacing.small }}>Deine Likes</div>
          {likesLoading ? (
            <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Laden...</div>
          ) : likedNodes.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Noch keine Likes</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {likedNodes.map((like) => {
                if (!like.node) return null;
                const n = like.node;
                return (
                  <button
                    key={like.id}
                    onClick={() => router.push(`/n/${n.parentId || n.id}`)}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: 10,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: r.borderRadius.small,
                      cursor: "pointer",
                      color: "white",
                      textAlign: "left" as const,
                      width: "100%",
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: r.borderRadius.small - 4, overflow: "hidden", flexShrink: 0, position: "relative" as const, background: "rgba(255,255,255,0.06)" }}>
                      {n.mediaUrl && (
                        <NextImage src={n.mediaUrl} alt={n.titel} fill style={{ objectFit: "cover" }} sizes="56px" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: r.fontSize.body, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{n.titel}</div>
                      <div style={{ fontSize: r.fontSize.small, opacity: 0.7, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{n.beschreibung}</div>
                      <div style={{ fontSize: r.fontSize.small - 1, opacity: 0.4, marginTop: 2 }}>
                        Tiefe {n.depth} &middot; {new Date(like.createdAt).toLocaleDateString("de")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
