import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import type { TreeSnapshot } from "@/lib/tree.types";

function loadActiveTree(): TreeSnapshot {
  const file = path.join(process.cwd(), "public", "tree.active.json");
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as TreeSnapshot;
}

export async function GET() {
  const tree = loadActiveTree();
  return NextResponse.json({
    treeId: tree.treeId,
    version: tree.version,
    startNodeId: tree.startNodeId,
  });
}
