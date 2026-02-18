"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// ---------- Types ----------

type ImageTaskSlim = { id: string; status: string; imageUrl: string | null; error: string | null };

type AdminNode = {
  id: string;
  titel: string;
  beschreibung: string;
  context: string;
  question: string | null;
  mediaUrl: string | null;
  side: string | null;
  depth: number;
  amountVisits: number;
  generated: boolean;
  discovererHash: string | null;
  discoveredAt: string | null;
  parentId: string | null;
  createdAt: string;
  imageTask: ImageTaskSlim | null;
};

type NodeStats = {
  totalNodes: number;
  discovered: number;
  undiscovered: number;
  withImage: number;
  withoutImage: number;
  generated: number;
  maxDepth: number;
};

type TreeNodeFlat = {
  id: string;
  titel: string;
  beschreibung: string;
  side: string | null;
  depth: number;
  amountVisits: number;
  generated: boolean;
  discovererHash: string | null;
  discoveredAt: string | null;
  mediaUrl: string | null;
  parentId: string | null;
  createdAt: string;
  imageStatus: string;
};

type TreeViewNode = TreeNodeFlat & { children: TreeViewNode[] };

// ---------- Helpers ----------

function sideBadge(side: string | null): React.ReactNode {
  const label = side === "left" ? "L" : side === "right" ? "R" : "\u25CF";
  const style = side === "left" ? ns.sideBadgeLeft : side === "right" ? ns.sideBadgeRight : ns.sideBadgeRoot;
  return <span style={{ ...ns.badge, ...style }}>{label}</span>;
}

function imageStatusDot(status: string): React.ReactNode {
  const colors: Record<string, string> = {
    none: "rgba(255,255,255,0.2)",
    pending: "rgba(255,200,50,0.9)",
    generating: "rgba(96,165,250,1)",
    completed: "rgba(52,199,89,0.9)",
    failed: "rgba(255,59,92,0.9)",
  };
  const color = colors[status] || colors.none;
  const pulse = status === "generating";
  return (
    <span
      title={status}
      style={{
        ...ns.statusDot,
        background: color,
        ...(pulse ? { animation: "pulse 1.2s infinite" } : {}),
      }}
    />
  );
}

function discoveryDot(discovered: boolean): React.ReactNode {
  return (
    <span
      title={discovered ? "Entdeckt" : "Unentdeckt"}
      style={{
        ...ns.statusDot,
        background: discovered ? "rgba(52,199,89,0.9)" : "rgba(255,255,255,0.15)",
      }}
    />
  );
}

function getImageStatus(node: AdminNode, placeholderUrl: string): string {
  if (node.imageTask) return node.imageTask.status;
  if (node.mediaUrl && node.mediaUrl !== placeholderUrl && node.mediaUrl !== "/media/placeholder.jpg") {
    return "completed";
  }
  return "none";
}

function buildTree(nodes: TreeNodeFlat[], rootId: string | null): TreeViewNode | null {
  const map = new Map<string, TreeViewNode>();
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  let root: TreeViewNode | null = null;
  for (const n of nodes) {
    const treeNode = map.get(n.id)!;
    if (n.id === rootId || (!n.parentId && !root)) {
      root = treeNode;
    } else if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(treeNode);
    }
  }
  for (const node of map.values()) {
    node.children.sort((a, b) => (a.side === "left" ? -1 : b.side === "left" ? 1 : 0));
  }
  return root;
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Component ----------

type Props = {
  sessionId: string;
  placeholderUrl: string;
  headers: () => Record<string, string>;
};

export function NodeManager({ sessionId, placeholderUrl, headers }: Props) {
  const [subView, setSubView] = useState<"table" | "tree">("table");

  // Table state
  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [stats, setStats] = useState<NodeStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sort, setSort] = useState("depth");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterImageStatus, setFilterImageStatus] = useState("");
  const [filterDiscovered, setFilterDiscovered] = useState("");
  const [filterGenerated, setFilterGenerated] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tree state
  const [treeNodes, setTreeNodes] = useState<TreeNodeFlat[]>([]);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Shared
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Table data fetching
  const reloadNodes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sessionId, page: String(page), pageSize: String(pageSize), sort, sortDir });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterImageStatus) params.set("filterImageStatus", filterImageStatus);
    if (filterDiscovered) params.set("filterDiscovered", filterDiscovered);
    if (filterGenerated) params.set("filterGenerated", filterGenerated);

    try {
      const res = await fetch(`/api/admin/nodes?${params}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [
    sessionId,
    page,
    pageSize,
    sort,
    sortDir,
    debouncedSearch,
    filterImageStatus,
    filterDiscovered,
    filterGenerated,
    headers,
  ]);

  useEffect(() => {
    if (subView === "table") reloadNodes();
  }, [subView, reloadNodes]);

  // Tree data fetching
  const reloadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/nodes/tree?sessionId=${sessionId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTreeNodes(data.nodes ?? []);
        setRootNodeId(data.rootNodeId ?? null);
        const autoExpand = new Set<string>();
        for (const n of data.nodes ?? []) {
          if (n.depth <= 1) autoExpand.add(n.id);
        }
        setExpandedNodes(autoExpand);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, headers]);

  useEffect(() => {
    if (subView === "tree") reloadTree();
  }, [subView, reloadTree]);

  // ---------- Actions ----------

  async function regenerateImage(nodeId: string) {
    setActionLoading(true);
    try {
      await fetch("/api/admin/nodes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "regenerate-image", nodeId, sessionId }),
      });
      if (subView === "table") await reloadNodes();
      else await reloadTree();
    } finally {
      setActionLoading(false);
    }
  }

  async function regenerateImagesBulk() {
    if (selectedNodes.size === 0) return;
    setActionLoading(true);
    try {
      await fetch("/api/admin/nodes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "regenerate-images-bulk", nodeIds: Array.from(selectedNodes), sessionId }),
      });
      setSelectedNodes(new Set());
      if (subView === "table") await reloadNodes();
      else await reloadTree();
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- Sorting ----------

  function toggleSort(field: string) {
    if (sort === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortArrow(field: string): string {
    if (sort !== field) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  // ---------- Bulk select ----------

  function toggleSelectNode(id: string) {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedNodes.size === nodes.length) {
      setSelectedNodes(new Set());
    } else {
      setSelectedNodes(new Set(nodes.map((n) => n.id)));
    }
  }

  // ---------- Tree expand ----------

  function toggleExpand(nodeId: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function expandAll() {
    setExpandedNodes(new Set(treeNodes.map((n) => n.id)));
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  // ---------- Selected detail ----------

  const selectedDetail: AdminNode | TreeNodeFlat | null =
    subView === "table"
      ? (nodes.find((n) => n.id === selectedNodeId) ?? null)
      : (treeNodes.find((n) => n.id === selectedNodeId) ?? null);

  // ---------- Tree rendering ----------

  function renderTreeNode(node: TreeViewNode): React.ReactNode[] {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    const elements: React.ReactNode[] = [
      <div
        key={node.id}
        onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
        style={{
          ...ns.treeRow,
          paddingLeft: 8 + node.depth * 24,
          ...(isSelected ? ns.treeRowSelected : {}),
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.id);
          }}
          style={{
            ...ns.expandChevron,
            opacity: hasChildren ? 0.7 : 0.15,
            cursor: hasChildren ? "pointer" : "default",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          {"\u25B6"}
        </span>
        {sideBadge(node.side)}
        <span
          style={{
            flex: 1,
            fontWeight: 800,
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.titel}
        </span>
        {imageStatusDot(node.imageStatus)}
        {discoveryDot(!!node.discovererHash)}
        {node.generated && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              color: "rgba(168,85,247,0.8)",
              background: "rgba(168,85,247,0.12)",
              padding: "1px 4px",
              borderRadius: 4,
            }}
          >
            AI
          </span>
        )}
        <span style={{ fontSize: 10, opacity: 0.4, minWidth: 24, textAlign: "right" }}>{node.amountVisits}</span>
      </div>,
    ];

    if (isExpanded) {
      for (const child of node.children) {
        elements.push(...renderTreeNode(child));
      }
    }

    return elements;
  }

  // ---------- Pagination ----------

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ---------- Render ----------

  return (
    <section style={ns.card}>
      {/* Pulse keyframe */}
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

      {/* Sub-tab bar + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setSubView("table")}
          style={{ ...ns.subTab, ...(subView === "table" ? ns.subTabActive : {}) }}
        >
          Tabelle
        </button>
        <button
          onClick={() => setSubView("tree")}
          style={{ ...ns.subTab, ...(subView === "tree" ? ns.subTabActive : {}) }}
        >
          Baumansicht
        </button>
        <button
          onClick={() => {
            if (subView === "table") reloadNodes();
            else reloadTree();
          }}
          disabled={loading}
          style={{ ...ns.subTab, opacity: loading ? 0.3 : 0.6 }}
          title="Daten neu laden"
        >
          {loading ? "..." : "\u21BB"}
        </button>
        <div style={{ flex: 1 }} />
        {stats && (
          <div style={ns.statsBar}>
            <span>{stats.totalNodes} Nodes</span>
            <span style={{ color: "rgba(52,199,89,0.9)" }}>{stats.discovered} entdeckt</span>
            <span style={{ color: "rgba(96,165,250,1)" }}>{stats.withImage} Bilder</span>
            <span style={{ color: "rgba(168,85,247,0.8)" }}>{stats.generated} AI</span>
            <span>Tiefe {stats.maxDepth}</span>
          </div>
        )}
      </div>

      {/* ========== TABLE VIEW ========== */}
      {subView === "table" && (
        <>
          {/* Filter bar */}
          <div style={ns.filterBar}>
            <input
              type="text"
              placeholder="Suche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...ns.filterInput, flex: 1, minWidth: 120 }}
            />
            <select
              value={filterImageStatus}
              onChange={(e) => {
                setFilterImageStatus(e.target.value);
                setPage(1);
              }}
              style={ns.filterSelect}
            >
              <option value="">Bild: Alle</option>
              <option value="none">Kein Bild</option>
              <option value="pending">Ausstehend</option>
              <option value="generating">Generiert...</option>
              <option value="completed">Fertig</option>
              <option value="failed">Fehlgeschlagen</option>
            </select>
            <select
              value={filterDiscovered}
              onChange={(e) => {
                setFilterDiscovered(e.target.value);
                setPage(1);
              }}
              style={ns.filterSelect}
            >
              <option value="">Entdeckt: Alle</option>
              <option value="true">Entdeckt</option>
              <option value="false">Unentdeckt</option>
            </select>
            <select
              value={filterGenerated}
              onChange={(e) => {
                setFilterGenerated(e.target.value);
                setPage(1);
              }}
              style={ns.filterSelect}
            >
              <option value="">Typ: Alle</option>
              <option value="true">AI-generiert</option>
              <option value="false">Manuell</option>
            </select>
          </div>

          {/* Bulk actions */}
          {selectedNodes.size > 0 && (
            <div style={ns.bulkToolbar}>
              <span>{selectedNodes.size} ausgewahlt</span>
              <button style={ns.bulkBtn} disabled={actionLoading} onClick={regenerateImagesBulk}>
                Bilder neu generieren
              </button>
              <button style={ns.bulkBtn} onClick={() => setSelectedNodes(new Set())}>
                Auswahl aufheben
              </button>
            </div>
          )}

          {/* Table header */}
          <div style={ns.tableHeader}>
            <span style={{ width: 28, textAlign: "center", cursor: "pointer" }} onClick={toggleSelectAll}>
              {selectedNodes.size === nodes.length && nodes.length > 0 ? "\u2611" : "\u2610"}
            </span>
            <span style={{ width: 70 }}>ID</span>
            <span style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleSort("titel")}>
              Titel{sortArrow("titel")}
            </span>
            <span style={{ width: 44, cursor: "pointer", textAlign: "center" }} onClick={() => toggleSort("depth")}>
              Tiefe{sortArrow("depth")}
            </span>
            <span style={{ width: 40, cursor: "pointer", textAlign: "center" }} onClick={() => toggleSort("side")}>
              Seite{sortArrow("side")}
            </span>
            <span
              style={{ width: 60, cursor: "pointer", textAlign: "right" }}
              onClick={() => toggleSort("amountVisits")}
            >
              Bes.{sortArrow("amountVisits")}
            </span>
            <span style={{ width: 28, textAlign: "center" }} title="Bild-Status">
              Bild
            </span>
            <span style={{ width: 28, textAlign: "center" }} title="Entdeckt">
              Ent.
            </span>
            <span style={{ width: 28, textAlign: "center" }} title="AI-generiert">
              AI
            </span>
            <span style={{ width: 80 }}>Aktionen</span>
          </div>

          {/* Loading */}
          {loading && <div style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>Laden...</div>}

          {/* Rows */}
          {!loading && nodes.length === 0 && (
            <div style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>Keine Nodes gefunden.</div>
          )}

          <div style={{ display: "grid", gap: 4 }}>
            {!loading &&
              nodes.map((node) => {
                const imgStatus = getImageStatus(node, placeholderUrl);
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    style={{
                      ...ns.nodeRow,
                      ...(isSelected ? ns.nodeRowSelected : {}),
                    }}
                  >
                    <span
                      style={{ width: 28, textAlign: "center", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectNode(node.id);
                      }}
                    >
                      {selectedNodes.has(node.id) ? "\u2611" : "\u2610"}
                    </span>
                    <span style={{ width: 70, fontFamily: "monospace", fontSize: 10, opacity: 0.5 }}>
                      {node.id.slice(0, 8)}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 800,
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {node.titel}
                    </span>
                    <span style={{ width: 44, textAlign: "center", fontSize: 11, opacity: 0.6 }}>{node.depth}</span>
                    <span style={{ width: 40, textAlign: "center" }}>{sideBadge(node.side)}</span>
                    <span style={{ width: 60, textAlign: "right", fontSize: 11, opacity: 0.6 }}>
                      {node.amountVisits}
                    </span>
                    <span style={{ width: 28, textAlign: "center" }}>{imageStatusDot(imgStatus)}</span>
                    <span style={{ width: 28, textAlign: "center" }}>{discoveryDot(!!node.discovererHash)}</span>
                    <span style={{ width: 28, textAlign: "center" }}>
                      {node.generated && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 900,
                            color: "rgba(168,85,247,0.8)",
                            background: "rgba(168,85,247,0.12)",
                            padding: "1px 4px",
                            borderRadius: 4,
                          }}
                        >
                          AI
                        </span>
                      )}
                    </span>
                    <span style={{ width: 80, display: "flex", gap: 4 }}>
                      <button
                        style={ns.actionBtn}
                        title="Bild neu generieren"
                        disabled={actionLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateImage(node.id);
                        }}
                      >
                        Img
                      </button>
                      <a
                        href={`/n/${node.id}`}
                        target="_blank"
                        rel="noopener"
                        style={{ ...ns.actionBtn, textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {"\u2197"}
                      </a>
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ ...ns.actionBtn, opacity: page <= 1 ? 0.3 : 1 }}
              >
                {"\u2190"}
              </button>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ ...ns.actionBtn, opacity: page >= totalPages ? 0.3 : 1 }}
              >
                {"\u2192"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ========== TREE VIEW ========== */}
      {subView === "tree" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button style={ns.tinyBtn} onClick={expandAll}>
              Alle aufklappen
            </button>
            <button style={ns.tinyBtn} onClick={collapseAll}>
              Alle zuklappen
            </button>
          </div>

          {loading && <div style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>Laden...</div>}

          {!loading && treeNodes.length === 0 && (
            <div style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>Keine Nodes vorhanden.</div>
          )}

          {!loading &&
            (() => {
              const tree = buildTree(treeNodes, rootNodeId);
              if (!tree) return null;
              return <div style={ns.treeContainer}>{renderTreeNode(tree)}</div>;
            })()}
        </>
      )}

      {/* ========== DETAIL PANEL ========== */}
      {selectedDetail && (
        <div style={ns.detailPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{selectedDetail.titel}</div>
            <button onClick={() => setSelectedNodeId(null)} style={ns.tinyBtn}>
              Schliessen
            </button>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {/* Image thumbnail */}
            {selectedDetail.mediaUrl && selectedDetail.mediaUrl !== placeholderUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedDetail.mediaUrl}
                alt=""
                style={{ width: 120, height: 120, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
              />
            )}

            {/* Metadata grid */}
            <div style={ns.detailGrid}>
              <span style={ns.detailLabel}>ID</span>
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>{selectedDetail.id}</span>

              <span style={ns.detailLabel}>Beschreibung</span>
              <span>{selectedDetail.beschreibung}</span>

              {"context" in selectedDetail && (
                <>
                  <span style={ns.detailLabel}>Kontext</span>
                  <span style={{ opacity: 0.7 }}>{(selectedDetail as AdminNode).context || "\u2014"}</span>
                </>
              )}

              {"question" in selectedDetail && (
                <>
                  <span style={ns.detailLabel}>Frage</span>
                  <span>{(selectedDetail as AdminNode).question || "\u2014"}</span>
                </>
              )}

              <span style={ns.detailLabel}>Tiefe</span>
              <span>{selectedDetail.depth}</span>

              <span style={ns.detailLabel}>Seite</span>
              <span>
                {selectedDetail.side === "left" ? "Links" : selectedDetail.side === "right" ? "Rechts" : "Root"}
              </span>

              <span style={ns.detailLabel}>Besuche</span>
              <span>{selectedDetail.amountVisits}</span>

              <span style={ns.detailLabel}>AI-generiert</span>
              <span>{selectedDetail.generated ? "Ja" : "Nein"}</span>

              <span style={ns.detailLabel}>Entdeckt</span>
              <span>{formatDate(selectedDetail.discoveredAt)}</span>

              <span style={ns.detailLabel}>Bild-Status</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {imageStatusDot(
                  "imageTask" in selectedDetail
                    ? getImageStatus(selectedDetail as AdminNode, placeholderUrl)
                    : (selectedDetail as TreeNodeFlat).imageStatus,
                )}
                <span style={{ fontSize: 11 }}>
                  {"imageTask" in selectedDetail
                    ? getImageStatus(selectedDetail as AdminNode, placeholderUrl)
                    : (selectedDetail as TreeNodeFlat).imageStatus}
                </span>
              </span>

              <span style={ns.detailLabel}>Erstellt</span>
              <span>{formatDate(selectedDetail.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button style={ns.detailBtn} disabled={actionLoading} onClick={() => regenerateImage(selectedDetail.id)}>
              Bild neu generieren
            </button>
            <a
              href={`/n/${selectedDetail.id}`}
              target="_blank"
              rel="noopener"
              style={{ ...ns.detailBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Im App anzeigen {"\u2197"}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Styles ----------

const ns: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },

  subTab: {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    opacity: 0.5,
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  subTabActive: {
    opacity: 1,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  statsBar: {
    display: "flex",
    gap: 12,
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.7,
    flexWrap: "wrap",
  },

  filterBar: {
    display: "flex",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterInput: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    fontSize: 12,
  },
  filterSelect: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    fontSize: 12,
    cursor: "pointer",
  },

  bulkToolbar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 10,
    background: "rgba(96,165,250,0.08)",
    border: "1px solid rgba(96,165,250,0.15)",
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 800,
  },
  bulkBtn: {
    border: "1px solid rgba(96,165,250,0.2)",
    background: "rgba(96,165,250,0.12)",
    color: "white",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11,
  },

  tableHeader: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "6px 10px",
    fontSize: 10,
    fontWeight: 900,
    opacity: 0.45,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 4,
    userSelect: "none",
  },

  nodeRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 10,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    transition: "background 0.1s, border-color 0.1s",
  },
  nodeRowSelected: {
    border: "1px solid rgba(96,165,250,0.3)",
    background: "rgba(96,165,250,0.06)",
  },

  badge: {
    fontSize: 9,
    fontWeight: 900,
    padding: "2px 5px",
    borderRadius: 5,
    display: "inline-block",
    letterSpacing: 0.3,
    lineHeight: 1,
  },
  sideBadgeLeft: {
    background: "rgba(96,165,250,0.15)",
    color: "rgba(96,165,250,1)",
  },
  sideBadgeRight: {
    background: "rgba(168,85,247,0.15)",
    color: "rgba(168,85,247,1)",
  },
  sideBadgeRoot: {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.4)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },

  actionBtn: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "4px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 10,
  },
  tinyBtn: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "5px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11,
  },

  // Tree view
  treeContainer: {
    display: "grid",
    gap: 2,
  },
  treeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 8px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.1s",
  },
  treeRowSelected: {
    background: "rgba(96,165,250,0.1)",
  },
  expandChevron: {
    width: 16,
    height: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    transition: "transform 0.15s",
    flexShrink: 0,
  },

  // Detail panel
  detailPanel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(96,165,250,0.2)",
    background: "rgba(96,165,250,0.04)",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: "4px 12px",
    fontSize: 12,
  },
  detailLabel: {
    opacity: 0.5,
    fontWeight: 800,
  },
  detailBtn: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
};
