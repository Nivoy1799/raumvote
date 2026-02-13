"use client";

import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faHeart, faPaperPlane, faUser } from "@fortawesome/free-solid-svg-icons";

type Comment = {
  id: string;
  text: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  treeId: string;
  treeVersion: string;
  optionId: string;
  voterId: string;
};

export function CommentBottomSheet({ isOpen, onClose, treeId, treeVersion, optionId, voterId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !voterId) return;
    fetch(
      `/api/comment?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(optionId)}&voterId=${encodeURIComponent(voterId)}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {});
  }, [isOpen, treeId, treeVersion, optionId, voterId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ treeId, treeVersion, optionId, voterId, text }),
      });
      const d = await res.json();
      if (d.comment) {
        setComments((prev) => [...prev, d.comment]);
        setText("");
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(commentId: string) {
    const res = await fetch("/api/comment/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commentId, voterId }),
    });
    const d = await res.json().catch(() => null);
    if (d?.liked === undefined) return;
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: d.liked, likeCount: c.likeCount + (d.liked ? 1 : -1) }
          : c
      )
    );
  }

  if (!isOpen) return null;

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.sheet}>
        <div style={s.header}>
          <div style={s.dragHandle} />
          <div style={s.headerRow}>
            <span style={s.headerTitle}>Comments ({comments.length})</span>
            <button onClick={onClose} style={s.closeBtn}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} style={s.list}>
          {comments.length === 0 ? (
            <div style={s.empty}>No comments yet. Be the first!</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} style={s.item}>
                <div style={s.itemRow}>
                  <div style={s.avatar}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" style={s.avatarImg} />
                    ) : (
                      <FontAwesomeIcon icon={faUser} style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemTop}>
                      <span style={s.username}>{c.username || "Anon"}</span>
                      <span style={s.time}>{relativeTime(c.createdAt)}</span>
                    </div>
                    <div style={s.text}>{c.text}</div>
                  </div>
                </div>
                <button onClick={() => toggleLike(c.id)} style={s.likeBtn}>
                  <FontAwesomeIcon
                    icon={faHeart}
                    style={{ fontSize: 13, color: c.isLiked ? "#ff3b5c" : "rgba(255,255,255,0.4)" }}
                  />
                  {c.likeCount > 0 && (
                    <span style={{ fontSize: 12, color: c.isLiked ? "#ff3b5c" : "rgba(255,255,255,0.5)" }}>
                      {c.likeCount}
                    </span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} style={s.inputBar}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            style={s.input}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            style={{ ...s.sendBtn, opacity: !text.trim() || submitting ? 0.35 : 1 }}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </form>
      </div>
    </>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    animation: "fadeIn 0.2s ease",
  },
  sheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60dvh",
    background: "rgba(18,18,18,0.98)",
    backdropFilter: "blur(20px)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    border: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "none",
    zIndex: 201,
    display: "flex",
    flexDirection: "column",
    animation: "slideUp 0.25s ease-out",
    color: "white",
  },
  header: {
    padding: "8px 16px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  dragHandle: {
    width: 36,
    height: 4,
    background: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    margin: "0 auto 10px",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: 900 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: 18,
    cursor: "pointer",
    padding: 6,
    opacity: 0.6,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  empty: { textAlign: "center", opacity: 0.45, padding: "36px 20px", fontSize: 14 },
  item: { display: "flex", flexDirection: "column", gap: 4 },
  itemRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" as const },
  itemTop: { display: "flex", alignItems: "center", gap: 8 },
  username: { fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.9)" },
  time: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  text: { fontSize: 14, lineHeight: 1.4, color: "rgba(255,255,255,0.82)" },
  likeBtn: {
    background: "none",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
    padding: "3px 0",
    width: "fit-content",
  },
  inputBar: {
    padding: "12px 14px",
    paddingBottom: "calc(12px + 64px + env(safe-area-inset-bottom))",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    gap: 10,
    background: "rgba(30,30,30,0.95)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "10px 16px",
    color: "white",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    background: "rgba(96,165,250,0.9)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    cursor: "pointer",
    fontSize: 15,
    flexShrink: 0,
  },
};
