"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchOption } from "@/lib/tree.client";
import { useAuth } from "@/lib/useAuth";

type LeaderRow = { optionId: string; count: number };
type ResultsPayload = {
  treeId: string;
  treeVersion: string;
  totalVotes: number;
  leaderboard: LeaderRow[];
};

export default function ResultsClient() {
  const router = useRouter();
  const { voterId } = useAuth();

  const [treeId, setTreeId] = useState("");
  const [treeVersion, setTreeVersion] = useState("");

  const [myOption, setMyOption] = useState<Option | null>(null);
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [optCache, setOptCache] = useState<Record<string, Option>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTreeMeta().then((m) => {
      setTreeId(m.treeId);
      setTreeVersion(m.version);
    });
  }, []);

  useEffect(() => {
    if (!voterId || !treeId || !treeVersion) return;

    (async () => {
      const res = await fetch(
        `/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&voterId=${encodeURIComponent(voterId)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => null);
      const optionId: string | null = j?.optionId ?? null;

      if (!optionId) {
        setMyOption(null);
        return;
      }
      const opt = await fetchOption(treeId, optionId);
      setMyOption(opt);
    })();
  }, [voterId, treeId, treeVersion]);

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

  return (
    <main style={s.shell}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.h1}>Ergebnisse</div>
          <div style={s.sub}>{treeId ? `${treeId} • ${treeVersion}` : "—"}</div>
        </div>

        <section style={s.card}>
          <div style={s.cardTitle}>Deine aktuelle Wahl</div>
          {!myOption ? (
            <div style={s.muted}>
              Du hast noch nicht abgestimmt.
              <div style={{ marginTop: 10 }}>
                <button style={s.btn} onClick={() => router.push("/start")}>Start</button>
              </div>
            </div>
          ) : (
            <div style={s.myPick}>
              <div style={s.myImgWrap}>
                <Image src={myOption.mediaUrl} alt={myOption.title} fill style={{ objectFit: "cover" }} />
                <div style={s.myShade} />
              </div>
              <div style={s.myText}>
                <div style={s.myTitle}>{myOption.title}</div>
                {myOption.description && <div style={s.myDesc}>{myOption.description}</div>}
                <div style={s.rowBtns}>
                  <button style={s.btn} onClick={() => router.push(`/o/${encodeURIComponent(myOption.id)}`)}>Öffnen</button>
                  <button style={s.btnGhost} onClick={() => router.push("/start")}>Ändern</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section style={s.card}>
          <div style={s.cardTitle}>Leaderboard</div>
          <div style={s.mutedSmall}>Total votes: {totalVotes}</div>

          {loading ? (
            <div style={s.muted}>Loading…</div>
          ) : !data || rows.length === 0 ? (
            <div style={s.muted}>Noch keine Stimmen.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {rows.map((r, idx) => (
                <div key={r.optionId} style={s.row}>
                  <div style={s.rank}>{idx + 1}</div>
                  <div style={s.rowMain}>
                    <div style={s.rowTop}>
                      <div style={s.rowTitle}>{r.option?.title ?? r.optionId}</div>
                      <div style={s.rowRight}>
                        <span style={s.count}>{r.count}</span>
                        <span style={s.pct}>{r.pct}%</span>
                      </div>
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${r.pct}%` }} />
                    </div>
                  </div>
                  <button style={s.rowBtn} onClick={() => router.push(`/o/${encodeURIComponent(r.optionId)}`)}>→</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100dvh", background: "black", color: "white" },
  container: { width: "min(560px, 100vw)", margin: "0 auto", padding: "18px 14px 110px" },
  header: { display: "grid", gap: 4, marginBottom: 14 },
  h1: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 12, opacity: 0.7 },

  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    backdropFilter: "blur(14px)",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 900, marginBottom: 6 },
  muted: { opacity: 0.75, fontSize: 13, lineHeight: 1.35, padding: "8px 0" },
  mutedSmall: { opacity: 0.65, fontSize: 12 },

  btn: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 850,
  },
  btnGhost: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 850,
  },

  myPick: { display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, marginTop: 8 },
  myImgWrap: { position: "relative", width: 96, height: 128, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" },
  myShade: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)" },
  myText: { minWidth: 0, display: "grid", gap: 6, alignContent: "start" },
  myTitle: { fontWeight: 950, letterSpacing: -0.2 },
  myDesc: { fontSize: 12, opacity: 0.75, lineHeight: 1.35 },
  rowBtns: { display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" },

  row: { display: "grid", gridTemplateColumns: "24px 1fr 34px", gap: 10, alignItems: "center", padding: "10px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.20)" },
  rank: { fontSize: 12, opacity: 0.75, fontWeight: 900, textAlign: "center" },
  rowMain: { minWidth: 0, display: "grid", gap: 8 },
  rowTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" },
  rowTitle: { fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowRight: { display: "flex", gap: 10, alignItems: "baseline" },
  count: { fontWeight: 900, opacity: 0.9 },
  pct: { fontWeight: 900, opacity: 0.7, fontSize: 12 },
  barTrack: { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.55)" },
  rowBtn: { border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "white", borderRadius: 12, width: 34, height: 34, cursor: "pointer", fontWeight: 950 },
};
