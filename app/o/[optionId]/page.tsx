"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchOption } from "@/lib/tree.client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faChartSimple, faShare } from "@fortawesome/free-solid-svg-icons";

export default function OptionPage() {
  const params = useParams<{ optionId: string }>();
  const optionId = params.optionId;

  const [treeId, setTreeId] = useState("");
  const [treeVersion, setTreeVersion] = useState("");
  const [option, setOption] = useState<Option | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem("voterId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("voterId", id);
    }
    setVoterId(id);
  }, []);

  useEffect(() => {
    fetchActiveTreeMeta().then((m) => {
      setTreeId(m.treeId);
      setTreeVersion(m.version);
    });
  }, []);

  useEffect(() => {
    if (!treeId || !optionId) return;
    fetchOption(treeId, optionId).then(setOption).catch(() => setOption(null));
  }, [treeId, optionId]);

  // load like/vote status
  useEffect(() => {
    if (!treeId || !treeVersion || !voterId || !optionId) return;

    (async () => {
      const [ls, lc, vs] = await Promise.all([
        fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(optionId)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(optionId)}`).then(r => r.json()),
        fetch(`/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
      ]);

      setLiked(!!ls.liked);
      setLikeCount(lc.count ?? 0);
      setVoted(vs.optionId === optionId);
    })();
  }, [treeId, treeVersion, voterId, optionId]);

  async function toggleLike() {
    if (!voterId) return;
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId, treeVersion, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.liked === undefined) return;
    setLiked(!!data.liked);
    setLikeCount((c) => c + (data.liked ? 1 : -1));
  }

  async function vote() {
    if (!voterId) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId, treeVersion, voterId, optionId }),
    });
    if (res.ok) setVoted(true);
  }

  const shareUrl = useMemo(() => {
    if (!option) return "";
    return `${window.location.origin}/o/${encodeURIComponent(option.id)}`;
  }, [option]);

  async function share() {
    if (!option) return;
    const url = shareUrl || window.location.href;
    if (navigator.share) {
      await navigator.share({ title: option.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (!option) {
    return (
      <main style={s.shell}>
        <div style={{ padding: 16 }}>Loading…</div>
      </main>
    );
  }

  return (
    <main style={s.shell}>
      <div style={s.container}>
        <div style={s.media}>
          <Image src={option.mediaUrl} alt={option.title} fill priority style={{ objectFit: "cover" }} />
          <div style={s.mediaShade} />
          <div style={s.mediaContent}>
            <div style={s.title}>{option.title}</div>
            {option.description && <div style={s.desc}>{option.description}</div>}
          </div>
        </div>

        <div style={s.actions}>
          <ActionBtn icon={faHeart} label={likeCount > 0 ? String(likeCount) : undefined} active={liked} onClick={toggleLike} />
          <ActionBtn icon={faChartSimple} label="Vote" active={voted} onClick={vote} />
          <ActionBtn icon={faShare} label="Share" onClick={share} />
        </div>
      </div>
    </main>
  );
}

function ActionBtn({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} style={{ ...s.actionBtn, ...(active ? s.actionBtnActive : null) }}>
      <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: active ? "#ff3b5c" : "white" }} />
      {label && <span style={{ fontSize: 12, color: active ? "#ff3b5c" : "rgba(255,255,255,0.8)" }}>{label}</span>}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    position: "fixed",
    inset: 0,
    background: "black",
    color: "white",
    overflow: "hidden",
    zIndex: 1,
    display: "grid",
    placeItems: "center",
  },

  container: {
    width: "min(560px, 100vw)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: 12,
  },

  media: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  mediaShade: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0) 60%)",
  },
  mediaContent: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  title: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  desc: { marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.35 },

  actions: {
    display: "flex",
    gap: 10,
    marginTop: 12,
    paddingBottom: 80,
  },

  actionBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    transition: "all 0.2s ease",
  },
  actionBtnActive: {
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 0 0 2px rgba(255,255,255,0.08), 0 0 14px rgba(255, 59, 92, 0.2)",
  },
};
