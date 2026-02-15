export type Choice = "left" | "right";

// --- New DB-backed tree types ---

export type TreeNodeData = {
  id: string;
  treeId: string;
  titel: string;
  beschreibung: string;
  context: string;
  question: string | null;
  mediaUrl: string | null;
  side: string | null;
  depth: number;
  generated: boolean;
  discovererHash: string | null;
  discoveredAt: string | null;
  amountVisits: number;
  parentId: string | null;
  createdAt: string;
};

export type NodePageData = {
  node: TreeNodeData;
  left: TreeNodeData | null;
  right: TreeNodeData | null;
};

export type GenerateResult = {
  node: TreeNodeData;
  left: TreeNodeData;
  right: TreeNodeData;
  isDiscoverer: boolean;
};

export type ActiveTreeMeta = {
  treeId: string;
  rootNodeId: string;
  placeholderUrl: string;
};

// --- Legacy types (kept for backward compat during migration) ---

export type NodeSide = {
  title: string;
  description?: string;
  mediaUrl: string;
  next?: string;
  end?: boolean;
};

export type Node = {
  id: string;
  question: string;
  leftOptionId: string;
  rightOptionId: string;
};

export type Option = {
  id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  nextNodeId?: string;
  isEnd?: boolean;
};

export type TreeSnapshot = {
  treeId: string;
  version: string;
  startNodeId: string;
  nodes: Record<string, Node>;
  options: Record<string, Option>;
};
