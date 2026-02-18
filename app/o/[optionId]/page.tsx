"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TreeNodeData } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchSingleNode } from "@/lib/tree.client";
import { useTTS } from "@/lib/useTTS";
import { faHeart, faCheckToSlot, faComment, faShare } from "@fortawesome/free-solid-svg-icons";
import { ActionRail } from "@/components/ActionRail";
import { CommentBottomSheet } from "@/components/CommentBottomSheet";
import { useAuth } from "@/lib/useAuth";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

export default function OptionPage() {
  const params = useParams<{ optionId: string }>();
  const router = useRouter();
  const optionId = params.optionId;
  const { voterId } = useAuth();
  const { isOpen } = useSession();
  const r = useResponsive();
  const { speak } = useTTS();

  const [sessionId, setSessionId] = useState("");
  const [placeholderUrl, setPlaceholderUrl] = useState("/media/placeholder.jpg");
  const [node, setNode] = useState<TreeNodeData | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [voted, setVoted] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  useEffect(() => {
    fetchActiveTreeMeta().then((m) => {
      setSessionId(m.sessionId);
      setPlaceholderUrl(m.placeholderUrl);
    });
  }, []);

  useEffect(() => {
    if (!optionId) return;
    fetchSingleNode(optionId)
      .then(setNode)
      .catch(() => setNode(null));
  }, [optionId]);

  // Speak option content via TTS
  useEffect(() => {
    if (node) {
      const text = node.context
        ? `${node.titel}. ${node.beschreibung}. ${node.context}`
        : `${node.titel}. ${node.beschreibung}`;
      speak(text);
    }
  }, [optionId, node?.id, speak]);

  useEffect(() => {
    if (!sessionId || !voterId || !optionId) return;
    (async () => {
      const [ls, lc, vs, cc] = await Promise.all([
        fetch(
          `/api/like/status?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(optionId)}&voterId=${encodeURIComponent(voterId)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/like/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(optionId)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/vote/status?sessionId=${encodeURIComponent(sessionId)}&voterId=${encodeURIComponent(voterId)}`,
        ).then((r) => r.json()),
        fetch(
          `/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(optionId)}`,
        ).then((r) => r.json()),
      ]);
      setLiked(!!ls.liked);
      setLikeCount(lc.count ?? 0);
      setVoted(vs.optionId === optionId);
      setCommentCount(cc.count ?? 0);
    })();
  }, [sessionId, voterId, optionId]);

  async function toggleLike() {
    if (!voterId) return;
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.liked === undefined) return;
    setLiked(!!data.liked);
    setLikeCount((c) => c + (data.liked ? 1 : -1));
  }

  async function vote() {
    if (!voterId) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) setVoted(data.optionId === optionId);
  }

  const shareUrl = useMemo(() => {
    if (!node) return "";
    return `${window.location.origin}/o/${encodeURIComponent(node.id)}`;
  }, [node]);

  async function share() {
    if (!node) return;
    const url = shareUrl || window.location.href;
    if (navigator.share) {
      await navigator.share({ title: node.titel, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (!node) {
    return (
      <main style={{ position: "fixed", inset: 0, background: "black", color: "white", zIndex: 1 }}>
        <div style={{ padding: 16 }}>Loading…</div>
      </main>
    );
  }

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        color: "white",
        overflow: "hidden",
        zIndex: 1,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: r.maxWidth,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: r.spacing.medium,
          paddingBottom: r.tabbarHeight + 16,
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            borderRadius: r.borderRadius.large,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <Image src={node.mediaUrl || placeholderUrl} alt={node.titel} fill priority style={{ objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0) 60%)",
            }}
          />

          <div style={{ position: "absolute", right: r.spacing.small + 4, bottom: r.spacing.medium, zIndex: 2 }}>
            <ActionRail
              disabled={!isOpen}
              items={[
                { icon: faHeart, active: liked, count: likeCount, ariaLabel: "Gefällt mir", onClick: toggleLike },
                { icon: faCheckToSlot, active: voted, activeColor: "#60a5fa", ariaLabel: "Abstimmen", onClick: vote },
                {
                  icon: faComment,
                  count: commentCount,
                  ariaLabel: "Kommentare",
                  onClick: () => setCommentModalOpen(true),
                },
                { icon: faShare, ariaLabel: "Teilen", onClick: share },
              ]}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: r.spacing.medium,
              right: r.actionRailSize + r.spacing.large,
              bottom: r.spacing.medium,
            }}
          >
            <div style={{ fontSize: r.fontSize.title + 3, fontWeight: 950, letterSpacing: -0.3 }}>{node.titel}</div>
            <div style={{ marginTop: 6, fontSize: r.fontSize.body - 1, opacity: 0.78, lineHeight: 1.35 }}>
              {node.beschreibung}
            </div>
            {node.context && (
              <div style={{ marginTop: 6, fontSize: r.fontSize.small, opacity: 0.5, lineHeight: 1.35 }}>
                {node.context}
              </div>
            )}
          </div>
        </div>

        {/* Continue exploring */}
        <button
          style={{
            marginTop: r.spacing.small,
            padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
            borderRadius: r.borderRadius.small,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.16)",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: r.fontSize.body,
            width: "100%",
          }}
          onClick={() => router.push(`/n/${encodeURIComponent(node.id)}`)}
        >
          Continue exploring
        </button>
      </div>
      {voterId && (
        <CommentBottomSheet
          isOpen={commentModalOpen}
          readOnly={!isOpen}
          onClose={() => {
            setCommentModalOpen(false);
            if (sessionId) {
              fetch(
                `/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(optionId)}`,
              )
                .then((r) => r.json())
                .then((d) => setCommentCount(d.count ?? 0));
            }
          }}
          sessionId={sessionId}
          optionId={optionId}
          voterId={voterId}
        />
      )}
    </main>
  );
}
