"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchActiveTreeMeta } from "@/lib/tree.client";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Abgelaufen";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days} Tag${days !== 1 ? "e" : ""} ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function StartPage() {
  const router = useRouter();
  const r = useResponsive();
  const { session } = useSession();

  // Gate: don't navigate until we've checked localStorage
  const [ready, setReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // PWA install prompt
  const deferredPromptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Check localStorage + PWA status on mount
  useEffect(() => {
    // PWA detection
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if user has seen the welcome screen
    const forceShow = new URLSearchParams(window.location.search).get("show-orientation-tip") === "true";
    const hasSeenWelcome = localStorage.getItem("rv-orientation-tip-seen");

    if (forceShow || !hasSeenWelcome) {
      setShowWelcome(true);
    } else {
      setDismissed(true);
    }
    setReady(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Navigate only after ready AND dismissed
  useEffect(() => {
    if (!ready) return;
    if (showWelcome && !dismissed) return;
    fetchActiveTreeMeta()
      .then((meta) => router.replace(`/n/${encodeURIComponent(meta.rootNodeId)}`))
      .catch(() => router.replace("/error"));
  }, [ready, dismissed, showWelcome, router]);

  function handleDismiss() {
    localStorage.setItem("rv-orientation-tip-seen", "1");
    setShowWelcome(false);
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const result = await deferredPromptRef.current.userChoice;
    if (result.outcome === "accepted") {
      setCanInstall(false);
      setIsStandalone(true);
    }
    deferredPromptRef.current = null;
  }

  // Detect iOS for manual install instructions
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const showPwaHint = !isStandalone && (canInstall || isIOS);

  // Session info
  const isActive = session?.status === "active";
  const remaining = session?.remainingMs ?? 0;

  return (
    <div style={{ padding: 16, color: "white", background: "black", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {!showWelcome && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: r.fontSize.title + 2, fontWeight: 900, marginBottom: 8 }}>Loading\u2026</div>
        </div>
      )}

      {showWelcome && !dismissed && (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          zIndex: 300,
          overflow: "auto",
        }}>
          <style>{`
            @keyframes rv-tip-in {
              0% { opacity: 0; transform: scale(0.9); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes rv-glow {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.7; }
            }
          `}</style>

          {/* Background glow */}
          <div style={{
            position: "fixed",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 30%, rgba(96,165,250,0.12) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)",
            pointerEvents: "none",
            animation: "rv-glow 4s ease-in-out infinite",
          }} />

          <div style={{
            position: "relative",
            zIndex: 1,
            padding: r.spacing.medium,
            maxWidth: 380,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            animation: "rv-tip-in 0.5s ease-out",
          }}>
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: r.fontSize.title + 12,
                fontWeight: 950,
                color: "white",
                letterSpacing: -1,
                lineHeight: 1.1,
              }}>
                RaumVote
              </div>
              <div style={{
                fontSize: r.fontSize.small,
                color: "rgba(96,165,250,0.8)",
                fontWeight: 700,
                marginTop: 6,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}>
                Dein Raum wartet
              </div>
            </div>

            {/* Session info */}
            {isActive && remaining > 0 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 14,
                background: "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.2)",
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "rgba(96,165,250,1)",
                  flexShrink: 0,
                  animation: "rv-glow 2s ease-in-out infinite",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: r.fontSize.small, fontWeight: 800, color: "white" }}>
                    Abstimmung läuft
                  </div>
                  <div style={{ fontSize: r.fontSize.small - 1, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                    noch {formatRemaining(remaining)}
                    {session?.title ? ` \u00b7 ${session.title}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* Orientation tip */}
            <div style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>📱</span>
                <span style={{ fontSize: r.fontSize.body, fontWeight: 800, color: "white" }}>Vertikal &amp; Horizontal</span>
              </div>
              <div style={{
                fontSize: r.fontSize.small,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.5,
              }}>
                Diese App funktioniert in <strong style={{ color: "rgba(96,165,250,1)" }}>vertikaler</strong> und <strong style={{ color: "rgba(139,92,246,1)" }}>horizontaler</strong> Ausrichtung.
                Drehe dein Handy f\u00fcr eine andere Ansicht!
              </div>
            </div>

            {/* PWA install hint */}
            {showPwaHint && (
              <div style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(74,222,128,0.06)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>+</span>
                  <span style={{ fontSize: r.fontSize.body, fontWeight: 800, color: "white" }}>Zum Homescreen hinzufügen</span>
                </div>
                <div style={{
                  fontSize: r.fontSize.small,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.5,
                  marginBottom: canInstall ? 10 : 0,
                }}>
                  {isIOS ? (
                    <>
                      Tippe auf <strong style={{ color: "rgba(74,222,128,0.9)" }}>Teilen</strong> (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: "middle", marginBottom: 2 }}>
                        <path d="M12 3v12M12 3l-4 4M12 3l4 4M4 15v4h16v-4" stroke="rgba(74,222,128,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      ) und w\u00e4hle <strong style={{ color: "rgba(74,222,128,0.9)" }}>&quot;Zum Home-Bildschirm&quot;</strong> f\u00fcr die beste Erfahrung.
                    </>
                  ) : (
                    <>Installiere RaumVote als App f\u00fcr schnelleren Zugriff und Vollbildmodus.</>
                  )}
                </div>
                {canInstall && (
                  <button
                    onClick={handleInstall}
                    style={{
                      background: "rgba(74,222,128,0.15)",
                      border: "1px solid rgba(74,222,128,0.3)",
                      color: "rgba(74,222,128,1)",
                      padding: "8px 16px",
                      borderRadius: 10,
                      fontSize: r.fontSize.small,
                      fontWeight: 800,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Jetzt installieren
                  </button>
                )}
              </div>
            )}

            {/* CTA button */}
            <button
              onClick={handleDismiss}
              style={{
                background: "white",
                color: "black",
                border: "none",
                padding: `${r.spacing.small + 8}px ${r.spacing.medium}px`,
                borderRadius: 14,
                fontSize: r.fontSize.body,
                fontWeight: 900,
                cursor: "pointer",
                letterSpacing: 0.3,
                width: "100%",
                marginTop: 4,
              }}
            >
              Los geht&apos;s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
