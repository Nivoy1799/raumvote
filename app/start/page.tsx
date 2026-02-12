"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchActiveTreeMeta } from "@/lib/tree.client";

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    fetchActiveTreeMeta()
      .then((meta) => router.replace(`/n/${encodeURIComponent(meta.startNodeId)}?t=${encodeURIComponent(meta.treeId)}&v=${encodeURIComponent(meta.version)}`))
      .catch(() => router.replace("/error"));
  }, [router]);

  return <div style={{ padding: 16, color: "white", background: "black", height: "100dvh" }}>Loading…</div>;
}
