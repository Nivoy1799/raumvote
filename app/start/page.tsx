"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchActiveTreeMeta } from "@/lib/tree.client";
import { useResponsive } from "@/lib/useResponsive";

export default function StartPage() {
  const router = useRouter();
  const r = useResponsive();
  const [showOrientationTip, setShowOrientationTip] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);

  useEffect(() => {
    const hasSeenTip = localStorage.getItem("rv-orientation-tip-seen");
    if (!hasSeenTip) {
      setShowOrientationTip(true);
    } else {
      setTipDismissed(true);
    }
  }, []);

  // Navigate only after tip is dismissed (or was already seen)
  useEffect(() => {
    if (!showOrientationTip || tipDismissed) {
      fetchActiveTreeMeta()
        .then((meta) => router.replace(`/n/${encodeURIComponent(meta.rootNodeId)}`))
        .catch(() => router.replace("/error"));
    }
  }, [tipDismissed, showOrientationTip, router]);

  const handleCloseTip = () => {
    localStorage.setItem("rv-orientation-tip-seen", "1");
    setShowOrientationTip(false);
    setTipDismissed(true);
  };

  return (
    <div style={{ padding: 16, color: "white", background: "black", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: r.fontSize.title + 2, fontWeight: 900, marginBottom: 8 }}>Loading…</div>
      </div>

      {showOrientationTip && (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.8)",
          zIndex: 300,
          backdropFilter: "blur(8px)",
          animation: "rv-tip-in 0.4s ease-out",
        }}>
          <style>{`
            @keyframes rv-tip-in {
              0% { opacity: 0; transform: scale(0.85); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div style={{
            textAlign: "center",
            padding: r.spacing.medium,
            background: "linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(139,92,246,0.15) 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(16px)",
            borderRadius: 20,
            maxWidth: 320,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
            <div style={{ fontSize: r.fontSize.title, fontWeight: 950, color: "white", marginBottom: 12 }}>
              RaumVote
            </div>
            <div style={{ fontSize: r.fontSize.body, color: "rgba(255,255,255,0.8)", marginBottom: 16, lineHeight: 1.5 }}>
              Diese App funktioniert in <strong>vertikaler</strong> und <strong>horizontaler</strong> Ausrichtung.
              <br />
              <br />
              Drehe dein Handy für eine andere Ansicht!
            </div>
            <button
              onClick={handleCloseTip}
              style={{
                background: "rgba(96,165,250,0.8)",
                color: "white",
                border: "none",
                padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                borderRadius: 12,
                fontSize: r.fontSize.body,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Verstanden!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
