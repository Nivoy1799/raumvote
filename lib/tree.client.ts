import type { Node, Option } from "./tree.types";

type ActiveTree = {
  treeId: string;
  version: string;
  startNodeId: string;
  nodes: Record<string, Node>;
  options: Record<string, Option>;
};

// Cache (damit wir nicht bei jedem Call neu fetchen)
let cachedTree: ActiveTree | null = null;

async function loadActiveTree(): Promise<ActiveTree> {
  if (cachedTree) return cachedTree;

  const res = await fetch("/tree.active.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load active tree");
  }

  const data = (await res.json()) as ActiveTree;
  cachedTree = data;
  return data;
}

export async function fetchActiveTreeMeta() {
  const tree = await loadActiveTree();
  return {
    treeId: tree.treeId,
    version: tree.version,
    startNodeId: tree.startNodeId,
  };
}

export async function fetchNode(treeId: string, nodeId: string): Promise<Node> {
  const tree = await loadActiveTree();

  const node = tree.nodes[nodeId];
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  return node;
}

export async function fetchOption(treeId: string, optionId: string): Promise<Option> {
  const tree = await loadActiveTree();

  const option = tree.options[optionId];
  if (!option) {
    throw new Error(`Option ${optionId} not found`);
  }

  return option;
}
