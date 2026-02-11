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
