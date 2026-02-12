"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function EndPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const t = sp.get("t") ?? "";
  const v = sp.get("v") ?? "";
  const nodeId = sp.get("nodeId") ?? "";

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1>Ende</h1>
      <p>Danke! Du hast den Entscheidungsweg abgeschlossen.</p>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => router.push("/start")}>Restart</button>
        <button onClick={() => router.push(`/results?t=${encodeURIComponent(t)}&v=${encodeURIComponent(v)}&nodeId=${encodeURIComponent(nodeId)}`)}>
          Results
        </button>
      </div>
    </main>
  );
}
