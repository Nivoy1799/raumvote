"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TreeNodeData } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchSingleNode } from "@/lib/tree.client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/useAuth";
import { useResponsive } from "@/lib/useResponsive";

export default function DreamPage() {
  const router = useRouter();
  const { voterId } = useAuth();
  const r = useResponsive();

  const [sessionId, setSessionId] = useState<string>("");
  const [placeholderUrl, setPlaceholderUrl] = useState("/media/placeholder.jpg");
  const [node, setNode] = useState<TreeNodeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTreeMeta().then((m) => {
      setSessionId(m.sessionId);
      setPlaceholderUrl(m.placeholderUrl);
    });
  }, []);

  useEffect(() => {
    if (!voterId || !sessionId) return;

    (async () => {
      setLoading(true);

      const res = await fetch(
        `/api/vote/status?sessionId=${encodeURIComponent(sessionId)}&voterId=${encodeURIComponent(voterId)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);
      const optionId: string | null = data?.optionId ?? null;

      if (!optionId) {
        setNode(null);
        setLoading(false);
        return;
      }

      const n = await fetchSingleNode(optionId);
      setNode(n);
      setLoading(false);
    })();
  }, [voterId, sessionId]);

  const shareUrl = useMemo(() => {
    if (!node) return "";
    return `${window.location.origin}/o/${encodeURIComponent(node.id)}`;
  }, [node]);

  async function share() {
    if (!node) return;
    const url = shareUrl || window.location.href;

    if (navigator.share) {
      await navigator.share({ title: "Mein RaumVote", url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  }

  const isMed = r.breakpoint === "medium";
  const isLrg = r.breakpoint === "large";

  return (
    <main style={{ position: "fixed", inset: 0, background: "black", color: "white", display: "grid", gridTemplateRows: `${isMed ? 48 : 64}px 1fr`, overflow: "hidden", zIndex: 1 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${r.spacing.medium}px`, background: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))" }}>
        <div style={{ fontWeight: 900, letterSpacing: -0.2, fontSize: r.fontSize.button }}>{"\u200B"}Your dream</div>
      </header>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: r.spacing.medium, textAlign: "center" as const }}>Loading…</div>
      ) : !node ? (
        <div style={{ display: "grid", placeItems: "center", padding: r.spacing.medium, textAlign: "center" as const, gap: 10 }}>
          <div style={{ fontSize: r.fontSize.body + 4, fontWeight: 900 }}>No vote yet</div>
          <div style={{ fontSize: r.fontSize.body - 1, opacity: 0.75, maxWidth: isLrg ? 500 : 360 }}>Pick an option in the split view — then it'll show up here.</div>
          <button style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.10)", color: "white", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, cursor: "pointer", fontWeight: 800, fontSize: r.fontSize.body }} onClick={() => router.push("/start")}>Start</button>
        </div>
      ) : (
        <section style={{ justifySelf: "center", width: r.maxWidth, padding: r.spacing.medium, paddingBottom: r.tabbarHeight + r.spacing.large, overflow: "auto", display: "flex", flexDirection: isMed ? "row" as const : "column" as const, minHeight: 0, gap: isMed ? r.spacing.medium : 0 }}>
          <div style={{ position: "relative", width: isMed ? "40%" : "100%", aspectRatio: isMed ? "1" : "4 / 5", maxHeight: isMed ? "none" : (isLrg ? "min(600px, 50dvh)" : "min(420px, 45dvh)"), borderRadius: r.borderRadius.large, overflow: "hidden", flexShrink: isMed ? 0 : 1 }}>
            <Image src={node.mediaUrl || placeholderUrl} alt={node.titel} fill priority style={{ objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0) 55%)" }} />
          </div>

          <div style={{ marginTop: isMed ? 0 : r.spacing.medium, padding: isMed ? 0 : "0 2px", flex: isMed ? 1 : undefined, minWidth: 0 }}>
            <div style={{ fontSize: r.fontSize.small, opacity: 0.7 }}>Your current vote</div>
            <div style={{ fontSize: r.fontSize.title + 3, fontWeight: 950, letterSpacing: -0.4, marginTop: 6 }}>{node.titel}</div>
            <div style={{ fontSize: r.fontSize.body, opacity: 0.78, marginTop: 8, lineHeight: 1.35 }}>{node.beschreibung}</div>

            <div style={{ display: "grid", gap: 10, marginTop: r.spacing.medium }}>
              <button style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.12)", color: "white", padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.medium, cursor: "pointer", fontWeight: 900, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", fontSize: r.fontSize.body }} onClick={share}>
                <FontAwesomeIcon icon={faShare} /> Share
              </button>

              <button
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "white", padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.medium, cursor: "pointer", fontWeight: 800, fontSize: r.fontSize.body }}
                onClick={() => router.push(`/o/${encodeURIComponent(node.id)}`)}
              >
                Open
              </button>

              <button style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "white", padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.medium, cursor: "pointer", fontWeight: 800, fontSize: r.fontSize.body }} onClick={() => router.push("/start")}>
                Change vote
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
