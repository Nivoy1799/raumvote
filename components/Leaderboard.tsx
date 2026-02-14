"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/tree.types";
import { fetchOption } from "@/lib/tree.client";
import { useResponsive } from "@/lib/useResponsive";

type LeaderRow = { optionId: string; count: number };
type ResultsPayload = {
  treeId: string;
  treeVersion: string;
  totalVotes: number;
  leaderboard: LeaderRow[];
};

export const Leaderboard = memo(function Leaderboard({
  treeId,
  treeVersion,
}: {
  treeId: string;
  treeVersion: string;
}) {
  const router = useRouter();
  const r = useResponsive();

  const [data, setData] = useState<ResultsPayload | null>(null);
  const [optCache, setOptCache] = useState<Record<string, Option>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!treeId || !treeVersion) return;

    (async () => {
      setLoading(true);
      const res = await fetch(
        `/api/results?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => null);
      setData(j);
      setLoading(false);
    })();
  }, [treeId, treeVersion]);

  useEffect(() => {
    if (!data) return;

    (async () => {
      const ids = data.leaderboard.map((x) => x.optionId);
      const missing = ids.filter((id) => !optCache[id]);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const opt = await fetchOption(data.treeId, id);
            return [id, opt] as const;
          } catch {
            return null;
          }
        })
      );

      const next: Record<string, Option> = {};
      for (const e of entries) if (e) next[e[0]] = e[1];
      setOptCache((prev) => ({ ...prev, ...next }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const totalVotes = data?.totalVotes ?? 0;

  const rows = useMemo(() => {
    if (!data) return [];
    return data.leaderboard.map((r) => ({
      ...r,
      option: optCache[r.optionId] ?? null,
      pct: totalVotes ? Math.round((r.count / totalVotes) * 100) : 0,
    }));
  }, [data, optCache, totalVotes]);

  const isLrg = r.breakpoint === "large";
  const btnSize = isLrg ? 44 : 34;
  const barH = isLrg ? 10 : 8;

  return (
    <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: r.borderRadius.medium, padding: r.spacing.medium, backdropFilter: "blur(14px)", marginBottom: r.spacing.medium }}>
      <div style={{ fontSize: r.fontSize.body, fontWeight: 900, marginBottom: 6 }}>Leaderboard</div>
      <div style={{ opacity: 0.65, fontSize: r.fontSize.small }}>Total votes: {totalVotes}</div>

      {loading ? (
        <div style={{ opacity: 0.75, fontSize: r.fontSize.body - 1, lineHeight: 1.35, padding: `${r.spacing.small}px 0` }}>Loading…</div>
      ) : !data || rows.length === 0 ? (
        <div style={{ opacity: 0.75, fontSize: r.fontSize.body - 1, lineHeight: 1.35, padding: `${r.spacing.small}px 0` }}>Noch keine Stimmen.</div>
      ) : (
        <div style={{ display: "grid", gap: r.spacing.small + 2, marginTop: r.spacing.medium }}>
          {rows.map((row, idx) => (
            <div key={row.optionId} style={{ display: "grid", gridTemplateColumns: `${isLrg ? 32 : 24}px 1fr ${btnSize}px`, gap: r.spacing.small + 2, alignItems: "center", padding: `${r.spacing.small + 2}px ${r.spacing.small + 2}px`, borderRadius: r.borderRadius.small, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ fontSize: r.fontSize.small, opacity: 0.75, fontWeight: 900, textAlign: "center" as const }}>{idx + 1}</div>
              <div style={{ minWidth: 0, display: "grid", gap: r.spacing.small }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontSize: r.fontSize.body }}>{row.option?.title ?? row.optionId}</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 900, opacity: 0.9, fontSize: r.fontSize.body }}>{row.count}</span>
                    <span style={{ fontWeight: 900, opacity: 0.7, fontSize: r.fontSize.small }}>{row.pct}%</span>
                  </div>
                </div>
                <div style={{ height: barH, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: barH, borderRadius: 999, background: "rgba(255,255,255,0.55)", width: `${row.pct}%` }} />
                </div>
              </div>
              <button
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "white", borderRadius: r.borderRadius.small - 2, width: btnSize, height: btnSize, cursor: "pointer", fontWeight: 950, fontSize: r.fontSize.body }}
                onClick={() => router.push(`/o/${encodeURIComponent(row.optionId)}`)}
              >
                →
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});
