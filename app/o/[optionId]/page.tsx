"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchOption } from "@/lib/tree.client";

export default function OptionPage() {
  const router = useRouter();
  const params = useParams<{ optionId: string }>();
  const optionId = params.optionId;

  const [treeId, setTreeId] = useState<string>("");
  const [option, setOption] = useState<Option | null>(null);

  useEffect(() => {
    fetchActiveTreeMeta().then((m) => setTreeId(m.treeId));
  }, []);

  useEffect(() => {
    if (!treeId || !optionId) return;
    fetchOption(treeId, optionId).then(setOption).catch(() => setOption(null));
  }, [treeId, optionId]);

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
      alert("Link copied");
    }
  }

  if (!option) {
    return (
      <main style={{ minHeight: "100dvh", background: "black", color: "white", padding: 16 }}>
        Loading…
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100dvh", background: "black", color: "white" }}>
      <div style={{ padding: 14, maxWidth: 560, margin: "0 auto", paddingBottom: 110 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              padding: "10px 12px",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Back
          </button>

          <button
            onClick={share}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              padding: "10px 12px",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Share
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: 420,
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <Image src={option.mediaUrl} alt={option.title} fill priority style={{ objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.0) 60%)",
            }}
          />
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.3 }}>{option.title}</div>
            {option.description && (
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.35 }}>
                {option.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
