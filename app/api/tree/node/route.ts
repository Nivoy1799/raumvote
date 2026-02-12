import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import type { TreeSnapshot } from "@/lib/tree.types";

function loadActiveTree(): TreeSnapshot {
  const file = path.join(process.cwd(), "data", "tree.active.json");
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as TreeSnapshot;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId") ?? "";
  const nodeId = searchParams.get("nodeId") ?? "";

  const tree = loadActiveTree();

  // In MVP: only one active tree file; later: resolve by treeId/version from DB/cache
  if (!treeId || treeId !== tree.treeId) {
    return NextResponse.json({ error: "Unknown treeId" }, { status: 400 });
  }

  const node = tree.nodes[nodeId];
  if (!node) {
    return NextResponse.json({ error: "Unknown nodeId" }, { status: 400 });
  }

  return NextResponse.json(node);
}
