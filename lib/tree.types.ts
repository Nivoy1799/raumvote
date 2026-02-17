export type Choice = "left" | "right";

export type TreeNodeData = {
  id: string;
  sessionId: string;
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
  totalNodes: number;
};

export type ActiveTreeMeta = {
  sessionId: string;
  rootNodeId: string;
  placeholderUrl: string;
};
