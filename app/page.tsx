"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { START_NODE_ID, TREE } from "@/lib/tree";
import { useState } from "react";
import { useSwipeChoice } from "@/lib/useSwipeChoice";

type Choice = "left" | "right";

export default function Home() {
  const router = useRouter();
  const node = TREE[START_NODE_ID];
  const [submitting, setSubmitting] = useState<Choice | null>(null);

  async function vote(choice: Choice) {
    try {
      setSubmitting(choice);
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, choice }),
      });
      if (!res.ok) throw new Error("Vote failed");
      router.push(`/results?nodeId=${encodeURIComponent(node.id)}`);
    } finally {
      setSubmitting(null);
    }
  }

  const swipe = useSwipeChoice({
    onChoice: (choice) => vote(choice),
    thresholdPx: 70,
  });

  return (
    <main style={s.shell}>
      <div style={s.phoneFrame} {...swipe.bind()}>
        {/* Top header (Shorts vibe) */}
        <header style={s.top}>
          <div style={s.topLeft}>
            <div style={s.dot} />
            <div>
              <div style={s.context}>Dorfplatz • Abstimmung</div>
              <div style={s.question}>{node.question}</div>
            </div>
          </div>

          <button
            style={s.topBtn}
            onClick={() => router.push(`/results?nodeId=${encodeURIComponent(node.id)}`)}
          >
            Results
          </button>
        </header>

        {/* 50/50 split */}
        <section style={s.split}>
          <button
            style={s.half}
            disabled={!!submitting}
            onClick={() => vote("left")}
            aria-label={node.left.label}
          >
            <div style={s.media}>
              <Image
                src={node.left.mediaUrl}
                alt={node.left.title}
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>

            <div style={s.overlay}>
              <div style={s.pill}>{node.left.label}</div>
              <div style={s.title}>{node.left.title}</div>
              {node.left.description && <div style={s.desc}>{node.left.description}</div>}
              {submitting === "left" && <div style={s.saving}>Saving…</div>}
            </div>

            <div style={s.edgeFadeLeft} />
          </button>

          <div style={s.centerDivider}>
            <div style={s.centerPip} />
          </div>

          <button
            style={s.half}
            disabled={!!submitting}
            onClick={() => vote("right")}
            aria-label={node.right.label}
          >
            <div style={s.media}>
              <Image
                src={node.right.mediaUrl}
                alt={node.right.title}
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>

            <div style={s.overlay}>
              <div style={s.pill}>{node.right.label}</div>
              <div style={s.title}>{node.right.title}</div>
              {node.right.description && <div style={s.desc}>{node.right.description}</div>}
              {submitting === "right" && <div style={s.saving}>Saving…</div>}
            </div>

            <div style={s.edgeFadeRight} />
          </button>
        </section>

      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    height: "100dvh",
    background: "black",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  phoneFrame: {
    position: "relative",
    width: "min(560px, 100vw)",
    height: "100dvh",
    background: "black",
    touchAction: "pan-y", // keep vertical gestures usable later
  },

  top: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    padding: "16px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 5,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))",
  },
  topLeft: { display: "flex", gap: 10, alignItems: "center", minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 99, background: "white", opacity: 0.9 },
  context: { color: "white", fontSize: 12, opacity: 0.75 },
  question: { color: "white", fontSize: 16, fontWeight: 800, marginTop: 2 },
  topBtn: {
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    fontSize: 12,
    fontWeight: 800,
  },

  split: {
    position: "absolute",
    inset: 0,
    display: "grid",
    gridTemplateColumns: "1fr 10px 1fr",
  },

  half: {
    position: "relative",
    border: "none",
    padding: 0,
    margin: 0,
    background: "transparent",
    cursor: "pointer",
    outline: "none",
    overflow: "hidden",
  },
  media: { position: "absolute", inset: 0 },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    color: "white",
    zIndex: 2,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
  },
  pill: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    fontSize: 12,
    fontWeight: 900,
  },
  title: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: -0.2,
  },
  desc: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.88,
    lineHeight: 1.35,
    maxWidth: 360,
  },
  saving: { marginTop: 10, fontSize: 12, opacity: 0.85 },

  centerDivider: {
    position: "relative",
    zIndex: 4,
    background: "linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
  },
  centerPip: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 10,
    height: 40,
    transform: "translate(-50%, -50%)",
    borderRadius: 999,
    background: "rgba(255,255,255,0.20)",
    backdropFilter: "blur(10px)",
  },

  edgeFadeLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 40,
    background: "linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.45))",
    zIndex: 3,
    pointerEvents: "none",
  },
  edgeFadeRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 40,
    background: "linear-gradient(to left, rgba(0,0,0,0), rgba(0,0,0,0.45))",
    zIndex: 3,
    pointerEvents: "none",
  },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "10px 14px 14px",
    zIndex: 6,
  },
  hintRow: { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" },
  hintPill: {
    fontSize: 12,
    fontWeight: 900,
    color: "white",
    padding: "8px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(10px)",
  },
  subHint: {
    marginTop: 8,
    textAlign: "center",
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
  },
};
