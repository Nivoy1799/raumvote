import type { ActiveTreeMeta, NodePageData, GenerateResult, TreeNodeData } from "./tree.types";

export async function fetchActiveTreeMeta(): Promise<ActiveTreeMeta> {
  const res = await fetch("/api/tree/active", { cache: "no-store" });
  if (!res.ok) throw new Error("No active tree");
  return res.json();
}

export async function fetchNodePage(nodeId: string): Promise<NodePageData | null> {
  const res = await fetch(`/api/tree/node?nodeId=${encodeURIComponent(nodeId)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateChildren(nodeId: string, voterId: string): Promise<GenerateResult> {
  const res = await fetch("/api/tree/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nodeId, voterId }),
  });
  if (!res.ok) throw new Error("Generation failed");
  return res.json();
}

export async function fetchSingleNode(nodeId: string): Promise<TreeNodeData | null> {
  const res = await fetch(`/api/tree/node?nodeId=${encodeURIComponent(nodeId)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.node ?? null;
}

export async function discoverNode(nodeId: string, voterId: string) {
  const res = await fetch("/api/tree/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nodeId, voterId }),
  });
  return res.json();
}
