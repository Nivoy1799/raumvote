"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchOption } from "@/lib/tree.client";
import { useAuth } from "@/lib/useAuth";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";
import { Leaderboard } from "@/components/Leaderboard";
import { SessionTimeline } from "@/components/SessionTimeline";

export default function ResultsClient() {
  const router = useRouter();
  const { voterId } = useAuth();
  const { session } = useSession();
  const r = useResponsive();

  const [treeId, setTreeId] = useState("");
  const [treeVersion, setTreeVersion] = useState("");
  const [myOption, setMyOption] = useState<Option | null>(null);

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

  const isLrg = r.breakpoint === "large";
  const imgW = isLrg ? 140 : 96;
  const imgH = isLrg ? 186 : 128;

  return (
    <main style={{ minHeight: "100dvh", background: "black", color: "white" }}>
      <div style={{ width: r.maxWidth, margin: "0 auto", padding: `${r.spacing.medium + 2}px ${r.spacing.medium}px ${r.tabbarHeight + r.spacing.large}px` }}>
        <div style={{ display: "grid", gap: 4, marginBottom: r.spacing.medium }}>
          <div style={{ fontSize: r.fontSize.title + 3, fontWeight: 950, letterSpacing: -0.3 }}>Ergebnisse</div>
          <div style={{ fontSize: r.fontSize.small, opacity: 0.7 }}>{treeId ? `${treeId} • ${treeVersion}` : "—"}</div>
        </div>

        <SessionTimeline session={session} />

        <section style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: r.borderRadius.medium, padding: r.spacing.medium, backdropFilter: "blur(14px)", marginBottom: r.spacing.medium }}>
          <div style={{ fontSize: r.fontSize.body, fontWeight: 900, marginBottom: 6 }}>Deine aktuelle Wahl</div>
          {!myOption ? (
            <div style={{ opacity: 0.75, fontSize: r.fontSize.body - 1, lineHeight: 1.35, padding: `${r.spacing.small}px 0` }}>
              Du hast noch nicht abgestimmt.
              <div style={{ marginTop: 10 }}>
                <button style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.10)", color: "white", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, cursor: "pointer", fontWeight: 850, fontSize: r.fontSize.body }} onClick={() => router.push("/start")}>Start</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `${imgW}px 1fr`, gap: r.spacing.medium, marginTop: r.spacing.small }}>
              <div style={{ position: "relative", width: imgW, height: imgH, borderRadius: r.borderRadius.small, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                <Image src={myOption.mediaUrl} alt={myOption.title} fill style={{ objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)" }} />
              </div>
              <div style={{ minWidth: 0, display: "grid", gap: 6, alignContent: "start" }}>
                <div style={{ fontWeight: 950, letterSpacing: -0.2, fontSize: r.fontSize.body }}>{myOption.title}</div>
                {myOption.description && <div style={{ fontSize: r.fontSize.small, opacity: 0.75, lineHeight: 1.35 }}>{myOption.description}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" as const }}>
                  <button style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.10)", color: "white", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, cursor: "pointer", fontWeight: 850, fontSize: r.fontSize.body }} onClick={() => router.push(`/o/${encodeURIComponent(myOption.id)}`)}>Öffnen</button>
                  <button style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "white", padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`, borderRadius: r.borderRadius.small, cursor: "pointer", fontWeight: 850, fontSize: r.fontSize.body }} onClick={() => router.push("/start")}>Ändern</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <Leaderboard treeId={treeId} treeVersion={treeVersion} />
      </div>
    </main>
  );
}
