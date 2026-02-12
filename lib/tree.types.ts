export type Choice = "left" | "right";

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
  version: string; // could be a hash later
  startNodeId: string;
  nodes: Record<string, Node>;
};

export type ActiveTreeMeta = Pick<TreeSnapshot, "treeId" | "version" | "startNodeId">;
