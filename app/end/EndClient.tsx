"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function EndClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const t = sp.get("t") ?? "";
  const v = sp.get("v") ?? "";
  const nodeId = sp.get("nodeId") ?? "";

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  async function share() {
    const url = shareUrl || window.location.href;
    if (navigator.share) await navigator.share({ title: "RaumVote", url });
    else {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  }

  return (
    <main style={{ minHeight: "100dvh", background: "black", color: "white", padding: 16, paddingBottom: 110 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: -0.3 }}>Ende 🎬</h1>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          {t && v ? `${t} • ${v}` : "—"} {nodeId ? `• ${nodeId}` : ""}
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <button
            onClick={() => router.push("/start")}
            style={btnPrimary}
          >
            Restart
          </button>

          <button
            onClick={share}
            style={btnGhost}
          >
            Share
          </button>

          <button
            onClick={() => router.push("/dream")}
            style={btnGhost}
          >
            Go to Dream
          </button>
        </div>
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  padding: "12px 14px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 900,
};

const btnGhost: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
  padding: "12px 14px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 900,
};
