"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchOption } from "@/lib/tree.client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShare, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function DreamPage() {
  const router = useRouter();

  const [voterId, setVoterId] = useState<string | null>(null);
  const [treeId, setTreeId] = useState<string>("");
  const [treeVersion, setTreeVersion] = useState<string>("");
  const [option, setOption] = useState<Option | null>(null);
  const [loading, setLoading] = useState(true);

  // voterId from localStorage
  useEffect(() => {
    let id = localStorage.getItem("voterId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("voterId", id);
    }
    setVoterId(id);
  }, []);

  // load active meta (treeId/version)
  useEffect(() => {
    fetchActiveTreeMeta().then((m) => {
      setTreeId(m.treeId);
      setTreeVersion(m.version);
    });
  }, []);

  // load voted option
  useEffect(() => {
    if (!voterId || !treeId || !treeVersion) return;

    (async () => {
      setLoading(true);

      const res = await fetch(
        `/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&voterId=${encodeURIComponent(voterId)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);
      const optionId: string | null = data?.optionId ?? null;

      if (!optionId) {
        setOption(null);
        setLoading(false);
        return;
      }

      const opt = await fetchOption(treeId, optionId);
      setOption(opt);
      setLoading(false);
    })();
  }, [voterId, treeId, treeVersion]);

  const shareUrl = useMemo(() => {
    if (!option) return "";
    return `${window.location.origin}/o/${encodeURIComponent(option.id)}`;
  }, [option]);

  async function share() {
    if (!option) return;
    const url = shareUrl || window.location.href;

    if (navigator.share) {
      await navigator.share({ title: "Mein Dorfplatz-Traum", url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  }

  return (
    <main style={s.shell}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => router.back()} aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div style={s.headerTitle}>Your dream</div>
        <div style={{ width: 40 }} />
      </header>

      {loading ? (
        <div style={s.center}>Loading…</div>
      ) : !option ? (
        <div style={s.center}>
          <div style={s.emptyTitle}>No vote yet</div>
          <div style={s.emptyText}>Pick an option in the split view — then it’ll show up here.</div>
          <button style={s.cta} onClick={() => router.push("/start")}>Start</button>
        </div>
      ) : (
        <section style={s.card}>
          <div style={s.media}>
            <Image src={option.mediaUrl} alt={option.title} fill priority style={{ objectFit: "cover" }} />
            <div style={s.mediaShade} />
          </div>

          <div style={s.content}>
            <div style={s.kicker}>Your current vote</div>
            <div style={s.title}>{option.title}</div>
            {option.description && <div style={s.desc}>{option.description}</div>}

            <div style={s.actions}>
              <button style={s.primary} onClick={share}>
                <FontAwesomeIcon icon={faShare} /> Share
              </button>

              <button
                style={s.secondary}
                onClick={() => router.push(`/o/${encodeURIComponent(option.id)}`)}
              >
                Open
              </button>

              <button style={s.secondary} onClick={() => router.push("/start")}>
                Change vote
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    height: "100dvh",
    background: "black",
    color: "white",
    display: "grid",
    gridTemplateRows: "64px 1fr",
  },

  header: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    padding: "0 12px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
  },
  headerTitle: { textAlign: "center", fontWeight: 900, letterSpacing: -0.2 },

  center: {
    display: "grid",
    placeItems: "center",
    padding: 18,
    textAlign: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: 900 },
  emptyText: { fontSize: 13, opacity: 0.75, maxWidth: 360 },

  cta: {
    marginTop: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
  },

  card: {
    alignSelf: "center",
    justifySelf: "center",
    width: "min(560px, 100vw)",
    padding: 12,
  },

media: {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",   // statt 9/16
  maxHeight: 420,        // limitiert die Höhe
  borderRadius: 22,
  overflow: "hidden",
},
  mediaShade: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0) 55%)",
  },

  content: { marginTop: 14, padding: "0 2px" },
  kicker: { fontSize: 12, opacity: 0.7 },
  title: { fontSize: 22, fontWeight: 950, letterSpacing: -0.4, marginTop: 6 },
  desc: { fontSize: 14, opacity: 0.78, marginTop: 8, lineHeight: 1.35 },

  actions: { display: "grid", gap: 10, marginTop: 16 },
  primary: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.12)",
    color: "white",
    padding: "12px 14px",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    padding: "12px 14px",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: 800,
  },
};
