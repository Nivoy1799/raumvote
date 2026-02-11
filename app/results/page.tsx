"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TREE } from "@/lib/tree";

type Results = {
  nodeId: string;
  leftCount: number;
  rightCount: number;
  total: number;
  leftPct: number;
  rightPct: number;
};

export default function ResultsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const nodeId = sp.get("nodeId") ?? "";
  const node = TREE[nodeId];
  const [data, setData] = useState<Results | null>(null);

  useEffect(() => {
    if (!nodeId) return;
    fetch(`/api/results?nodeId=${encodeURIComponent(nodeId)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [nodeId]);

  if (!node) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Unknown node</h1>
        <button onClick={() => router.push("/")}>Back</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Ergebnis</h1>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>{node.question}</div>

      {!data ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <ResultCard
            title={node.left.label}
            subtitle={node.left.title}
            count={data.leftCount}
            pct={data.leftPct}
          />
          <ResultCard
            title={node.right.label}
            subtitle={node.right.title}
            count={data.rightCount}
            pct={data.rightPct}
          />
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Total votes: {data.total}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button onClick={() => router.push("/")} style={btnStyle}>
          Nochmals abstimmen
        </button>
      </div>
    </main>
  );
}

function ResultCard(props: { title: string; subtitle: string; count: number; pct: number }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 700 }}>{props.title}</div>
      <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>{props.subtitle}</div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
        <div>{props.count} votes</div>
        <div style={{ fontWeight: 700 }}>{props.pct}%</div>
      </div>
      <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 999, marginTop: 8 }}>
        <div
          style={{
            height: 8,
            width: `${props.pct}%`,
            background: "rgba(0,0,0,0.55)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  cursor: "pointer",
};
