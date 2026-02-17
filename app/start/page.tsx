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
          background: "rgba(0,0,0,0.85)",
          zIndex: 300,
          backdropFilter: "blur(12px)",
          animation: "rv-tip-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <style>{`
            @keyframes rv-tip-in {
              0% { opacity: 0; transform: scale(0.8) rotateY(-10deg); }
              50% { transform: scale(1.02) rotateY(-2deg); }
              100% { opacity: 1; transform: scale(1) rotateY(0deg); }
            }
            @keyframes rv-phone-bounce {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-8px) rotate(1deg); }
            }
            .rv-tip-icon {
              animation: rv-phone-bounce 3s ease-in-out infinite;
            }
          `}</style>
          <div style={{
            textAlign: "center",
            padding: `${r.spacing.medium + 6}px ${r.spacing.medium}px`,
            background: "linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(139,92,246,0.2) 100%)",
            border: "1px solid rgba(96,165,250,0.4)",
            backdropFilter: "blur(20px)",
            borderRadius: 32,
            maxWidth: 340,
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Background gradient effect */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 30% -20%, rgba(96,165,250,0.15) 0%, transparent 50%), radial-gradient(circle at 120% 80%, rgba(139,92,246,0.15) 0%, transparent 50%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="rv-tip-icon" style={{ fontSize: 56, marginBottom: 16, display: "inline-block" }}>📱</div>

              <div style={{
                fontSize: r.fontSize.title + 2,
                fontWeight: 950,
                color: "white",
                marginBottom: 8,
                letterSpacing: -0.5,
              }}>
                RaumVote
              </div>

              <div style={{
                fontSize: r.fontSize.small,
                color: "rgba(96,165,250,0.8)",
                marginBottom: 16,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                Dein Raum wartet
              </div>

              <div style={{
                fontSize: r.fontSize.body,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}>
                Diese App funktioniert in <strong style={{ color: "rgba(96,165,250,1)" }}>vertikaler</strong> und <strong style={{ color: "rgba(139,92,246,1)" }}>horizontaler</strong> Ausrichtung.
                <br />
                <br />
                <span style={{ fontSize: r.fontSize.body - 1, opacity: 0.9 }}>Drehe dein Handy für eine andere Ansicht! 🔄</span>
              </div>

              <button
                onClick={handleCloseTip}
                style={{
                  background: "#000000",
                  color: "white",
                  border: "1px solid rgba(96,165,250,0.6)",
                  padding: `${r.spacing.small + 6}px ${r.spacing.medium + 4}px`,
                  borderRadius: 14,
                  fontSize: r.fontSize.body,
                  fontWeight: 900,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: "0 0 20px rgba(96,165,250,0.2)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.95)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(96,165,250,0.4)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#000000";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(96,165,250,0.2)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                Verstanden! ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
