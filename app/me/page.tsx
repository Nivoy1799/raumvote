"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCamera, faHeart, faGear, faSignOutAlt, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/useAuth";
import { useResponsive } from "@/lib/useResponsive";
import { useTTS } from "@/lib/useTTS";

type DiscoveredNode = {
  id: string;
  titel: string;
  beschreibung: string;
  mediaUrl: string | null;
  depth: number;
  createdAt: string;
  parent: { id: string } | null;
};

type LikedNode = {
  id: string;
  optionId: string;
  createdAt: string;
  node: {
    id: string;
    titel: string;
    beschreibung: string;
    mediaUrl: string | null;
    parentId: string | null;
    depth: number;
  } | null;
};

export default function MePage() {
  const { voterId } = useAuth();
  const router = useRouter();
  const r = useResponsive();
  const { speak, stop, isSpeaking, voices, supported: ttsSupported } = useTTS();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [likedNodes, setLikedNodes] = useState<LikedNode[]>([]);
  const [likesLoading, setLikesLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<
    "profile" | "account" | "likes" | "discoveries" | "settings" | "delete"
  >("profile");

  // Settings state
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [colorblindMode, setColorblindMode] = useState("none");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState("");
  const [ttsRate, setTtsRate] = useState(1);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Discoveries state
  const [discoveries, setDiscoveries] = useState<DiscoveredNode[]>([]);
  const [discoveriesLoading, setDiscoveriesLoading] = useState(false);

  // Load user profile and liked nodes
  useEffect(() => {
    if (!voterId) return;
    (async () => {
      queueMicrotask(() => setLoading(true));
      const res = await fetch(`/api/me?voterId=${encodeURIComponent(voterId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setUsername((data?.username ?? "").toString());
      setAvatarUrl(data?.avatarUrl || null);
      setLoading(false);
    })();
    // Fetch liked nodes
    (async () => {
      queueMicrotask(() => setLikesLoading(true));
      const res = await fetch(`/api/like/list?voterId=${encodeURIComponent(voterId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setLikedNodes(data?.likes ?? []);
      setLikesLoading(false);
    })();
  }, [voterId]);

  // Load settings from localStorage
  useEffect(() => {
    const vibOff = localStorage.getItem("rv-vibration-disabled");
    const cbMode = localStorage.getItem("rv-colorblind-mode");
    const ttsOn = localStorage.getItem("rv-tts-enabled");
    const voice = localStorage.getItem("rv-tts-voice");
    const rate = localStorage.getItem("rv-tts-rate");

    queueMicrotask(() => {
      setVibrationEnabled(vibOff !== "0");
      setColorblindMode(cbMode || "none");
      setTtsEnabled(ttsOn === "1");
      setTtsVoice(voice || "");
      setTtsRate(rate ? parseFloat(rate) : 1);
      setSettingsLoaded(true);
    });
  }, []);

  const maskedId = useMemo(() => {
    if (!voterId) return "";
    return `${voterId.slice(0, 8)}…${voterId.slice(-6)}`;
  }, [voterId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 160, 160);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaved(false);
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voterId, username, avatarUrl }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  }

  const isLrg = r.breakpoint === "large";
  const avatarSize = isLrg ? 120 : 80;

  const handleLogout = async () => {
    if (confirm("Wirklich abmelden?")) {
      localStorage.removeItem("voterId");
      router.push("/denied");
    }
  };

  return (
    <main style={{ position: "fixed", inset: 0, background: "black", color: "white", overflow: "auto", zIndex: 1 }}>
      <div
        style={{
          width: r.maxWidth,
          margin: "0 auto",
          padding: `${r.spacing.medium + 2}px ${r.spacing.medium}px ${r.tabbarHeight + r.spacing.large}px`,
        }}
      >
        {/* Header with back button */}
        {currentPage !== "profile" && (
          <button
            onClick={() => setCurrentPage("profile")}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: r.fontSize.body,
              cursor: "pointer",
              marginBottom: r.spacing.medium,
              opacity: 0.7,
            }}
          >
            ← Zurück
          </button>
        )}

        {currentPage === "profile" && (
          <>
            <div style={{ fontSize: r.fontSize.title + 3, fontWeight: 950, letterSpacing: -0.3 }}>Profil</div>
            <div style={{ fontSize: r.fontSize.small, opacity: 0.7, marginTop: 6, lineHeight: 1.35 }}>
              Verwalte dein Konto und deine Einstellungen.
            </div>

            <section
              style={{
                marginTop: r.spacing.medium,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: r.borderRadius.medium,
                padding: r.spacing.medium,
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: r.spacing.medium }}>
                <button
                  onClick={() => setCurrentPage("account")}
                  style={{
                    position: "relative" as const,
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "2px solid rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "visible",
                    cursor: "pointer",
                    padding: 0,
                    color: "white",
                    transition: "all 0.2s ease",
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: "50%",
                        objectFit: "cover" as const,
                      }}
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faUser}
                      style={{ fontSize: isLrg ? 48 : 32, color: "rgba(255,255,255,0.4)" }}
                    />
                  )}
                </button>
              </div>

              <div style={{ fontSize: r.fontSize.body, fontWeight: 850, marginBottom: r.spacing.small }}>
                Deine lokale ID
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: r.spacing.large,
                }}
              >
                <code
                  style={{
                    display: "inline-flex",
                    padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.35)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: r.fontSize.small,
                    overflow: "hidden",
                  }}
                >
                  {maskedId || "—"}
                </code>
                <button
                  style={{
                    width: isLrg ? 48 : 40,
                    height: isLrg ? 48 : 40,
                    borderRadius: r.borderRadius.small,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: r.fontSize.body,
                  }}
                  onClick={async () => voterId && navigator.clipboard.writeText(voterId)}
                  aria-label="Copy voterId"
                  title="Copy"
                >
                  ⧉
                </button>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: "grid", gap: 8 }}>
                <button
                  onClick={() => setCurrentPage("account")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  <FontAwesomeIcon icon={faUser} /> Konto
                </button>
                <button
                  onClick={() => setCurrentPage("likes")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  <FontAwesomeIcon icon={faHeart} /> Deine Likes
                </button>
                <button
                  onClick={() => {
                    setCurrentPage("discoveries");
                    if (voterId && discoveries.length === 0) {
                      setDiscoveriesLoading(true);
                      fetch(`/api/me/discoveries?voterId=${encodeURIComponent(voterId)}`, { cache: "no-store" })
                        .then((res) => res.json())
                        .then((data) => {
                          setDiscoveries(data.discoveries ?? []);
                          setDiscoveriesLoading(false);
                        })
                        .catch(() => setDiscoveriesLoading(false));
                    }
                  }}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  🔍 Entdeckungen
                </button>
                <button
                  onClick={() => setCurrentPage("settings")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  <FontAwesomeIcon icon={faGear} /> Einstellungen
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    background: "rgba(255,165,0,0.1)",
                    border: "1px solid rgba(255,165,0,0.25)",
                    color: "rgba(255,165,0,0.9)",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 750,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} /> Abmelden
                </button>
              </div>
            </section>
          </>
        )}

        {/* Account Page */}
        {currentPage === "account" && (
          <>
            <section
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: r.borderRadius.medium,
                padding: r.spacing.medium,
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: r.spacing.medium }}>
                <button
                  style={{
                    position: "relative" as const,
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "2px solid rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "visible",
                    cursor: "pointer",
                    padding: 0,
                    color: "white",
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: "50%",
                        objectFit: "cover" as const,
                      }}
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faUser}
                      style={{ fontSize: isLrg ? 48 : 32, color: "rgba(255,255,255,0.4)" }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute" as const,
                      bottom: -2,
                      right: -2,
                      width: isLrg ? 34 : 26,
                      height: isLrg ? 34 : 26,
                      borderRadius: "50%",
                      background: "rgba(96,165,250,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid black",
                    }}
                  >
                    <FontAwesomeIcon icon={faCamera} style={{ fontSize: isLrg ? 14 : 11 }} />
                  </div>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              </div>

              <label style={{ fontSize: r.fontSize.small, opacity: 0.75, fontWeight: 850 }}>Benutzername</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={save}
                placeholder="z.B. Liam_14"
                maxLength={24}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                  borderRadius: r.borderRadius.small,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                  outline: "none",
                  fontSize: r.fontSize.body,
                  fontWeight: 750,
                }}
                disabled={loading}
              />

              <div
                style={{ marginTop: r.spacing.medium, display: "flex", alignItems: "center", gap: 10, minHeight: 20 }}
              >
                {saved && (
                  <div
                    style={{
                      fontSize: r.fontSize.small,
                      opacity: 0.85,
                      animation: "fadeOut 1.5s ease-in-out forwards",
                      animationDelay: "0.3s",
                    }}
                  >
                    Gespeichert ✓
                  </div>
                )}
              </div>
              <style>{`
                @keyframes fadeOut {
                  0%, 60% { opacity: 0.85; }
                  100% { opacity: 0; }
                }
              `}</style>
            </section>
          </>
        )}

        {/* Likes Page */}
        {currentPage === "likes" && (
          <div>
            <div
              style={{
                fontSize: r.fontSize.title + 2,
                fontWeight: 950,
                letterSpacing: -0.3,
                marginBottom: r.spacing.small,
              }}
            >
              Deine Likes
            </div>
            {likesLoading ? (
              <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Laden...</div>
            ) : likedNodes.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Noch keine Likes</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {likedNodes.map((like) => {
                  if (!like.node) return null;
                  const n = like.node;
                  return (
                    <button
                      key={like.id}
                      onClick={() => router.push(`/n/${n.parentId || n.id}`)}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: r.borderRadius.small,
                        cursor: "pointer",
                        color: "white",
                        textAlign: "left" as const,
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: r.borderRadius.small - 4,
                          overflow: "hidden",
                          flexShrink: 0,
                          position: "relative" as const,
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        {n.mediaUrl && (
                          <NextImage src={n.mediaUrl} alt={n.titel} fill style={{ objectFit: "cover" }} sizes="56px" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: r.fontSize.body,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {n.titel}
                        </div>
                        <div
                          style={{
                            fontSize: r.fontSize.small,
                            opacity: 0.7,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {n.beschreibung}
                        </div>
                        <div style={{ fontSize: r.fontSize.small - 1, opacity: 0.4, marginTop: 2 }}>
                          Tiefe {n.depth} &middot;{" "}
                          {new Date(like.createdAt).toLocaleDateString("de-CH", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Discoveries Page */}
        {currentPage === "discoveries" && (
          <div>
            <div
              style={{
                fontSize: r.fontSize.title + 2,
                fontWeight: 950,
                letterSpacing: -0.3,
                marginBottom: r.spacing.small,
              }}
            >
              Deine Entdeckungen
            </div>
            <div style={{ fontSize: r.fontSize.small, opacity: 0.7, marginBottom: r.spacing.medium }}>
              Nodes, die du als Erste entdeckt hast 🔍
            </div>
            {discoveriesLoading ? (
              <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Laden...</div>
            ) : discoveries.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: r.fontSize.body }}>Noch keine Entdeckungen</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {discoveries.map((disc) => {
                  return (
                    <button
                      key={disc.id}
                      onClick={() => router.push(`/n/${disc.parent?.id || disc.id}`)}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: 10,
                        border: "1px solid rgba(96,165,250,0.20)",
                        background: "rgba(96,165,250,0.06)",
                        borderRadius: r.borderRadius.small,
                        cursor: "pointer",
                        color: "white",
                        textAlign: "left" as const,
                        width: "100%",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(96,165,250,0.12)";
                        e.currentTarget.style.borderColor = "rgba(96,165,250,0.40)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(96,165,250,0.06)";
                        e.currentTarget.style.borderColor = "rgba(96,165,250,0.20)";
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: r.borderRadius.small - 4,
                          overflow: "hidden",
                          flexShrink: 0,
                          position: "relative" as const,
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        {disc.mediaUrl && (
                          <NextImage
                            src={disc.mediaUrl}
                            alt={disc.titel}
                            fill
                            style={{ objectFit: "cover" }}
                            sizes="56px"
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: r.fontSize.body,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {disc.titel}
                        </div>
                        <div
                          style={{
                            fontSize: r.fontSize.small,
                            opacity: 0.7,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {disc.beschreibung}
                        </div>
                        <div style={{ fontSize: r.fontSize.small - 1, opacity: 0.4, marginTop: 2 }}>
                          Tiefe {disc.depth} &middot; ⭐ Entdeckt{" "}
                          {new Date(disc.createdAt).toLocaleDateString("de-CH", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Page */}
        {currentPage === "settings" && (
          <div>
            <div
              style={{
                fontSize: r.fontSize.title + 2,
                fontWeight: 950,
                letterSpacing: -0.3,
                marginBottom: r.spacing.medium,
              }}
            >
              Einstellungen
            </div>
            <section
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: r.borderRadius.medium,
                padding: r.spacing.medium,
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{ fontSize: r.fontSize.body, fontWeight: 850, marginBottom: r.spacing.small }}>
                Vibrationen
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  marginBottom: r.spacing.medium,
                }}
              >
                <input
                  type="checkbox"
                  checked={vibrationEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setVibrationEnabled(enabled);
                    localStorage.setItem("rv-vibration-disabled", enabled ? "0" : "1");
                  }}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: r.fontSize.body, opacity: 0.8 }}>Vibrationen aktivieren</span>
              </label>

              <div
                style={{
                  fontSize: r.fontSize.body,
                  fontWeight: 850,
                  marginBottom: r.spacing.small,
                  marginTop: r.spacing.medium,
                }}
              >
                Farbblindheit
              </div>
              <select
                value={colorblindMode}
                onChange={(e) => {
                  setColorblindMode(e.target.value);
                  localStorage.setItem("rv-colorblind-mode", e.target.value);
                }}
                style={{
                  width: "100%",
                  padding: `${r.spacing.small + 2}px ${r.spacing.small}px`,
                  borderRadius: r.borderRadius.small,
                  border: "1px solid rgba(96,165,250,0.3)",
                  background: "rgba(96,165,250,0.1)",
                  color: "white",
                  fontSize: r.fontSize.body,
                  marginBottom: r.spacing.medium,
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="none" style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>
                  Keine
                </option>
                <option value="deuteranopia" style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>
                  Deuteranopia (Rotgrünblindheit)
                </option>
                <option value="protanopia" style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>
                  Protanopia (Rotblindheit)
                </option>
                <option value="tritanopia" style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>
                  Tritanopia (Blaugelb-Blindheit)
                </option>
              </select>

              {/* TTS Settings */}
              <div
                style={{
                  fontSize: r.fontSize.body,
                  fontWeight: 850,
                  marginBottom: r.spacing.small,
                  marginTop: r.spacing.medium,
                }}
              >
                Vorlesen (Text-zu-Sprache)
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  marginBottom: r.spacing.medium,
                }}
              >
                <input
                  id="tts-enable"
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setTtsEnabled(enabled);
                    localStorage.setItem("rv-tts-enabled", enabled ? "1" : "0");
                  }}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                  aria-describedby="tts-desc"
                />
                <span style={{ fontSize: r.fontSize.body, opacity: 0.8 }}>Vorlesen aktivieren</span>
              </label>
              <div id="tts-desc" style={{ fontSize: r.fontSize.small, opacity: 0.6, marginBottom: r.spacing.medium }}>
                Inhalte werden automatisch vorgelesen
              </div>

              {ttsEnabled && (
                <>
                  <label
                    htmlFor="tts-voice"
                    style={{
                      fontSize: r.fontSize.small,
                      opacity: 0.75,
                      fontWeight: 850,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Stimme
                  </label>
                  <select
                    id="tts-voice"
                    value={ttsVoice}
                    onChange={(e) => {
                      setTtsVoice(e.target.value);
                      localStorage.setItem("rv-tts-voice", e.target.value);
                    }}
                    style={{
                      width: "100%",
                      padding: `${r.spacing.small + 2}px ${r.spacing.small}px`,
                      borderRadius: r.borderRadius.small,
                      border: "1px solid rgba(96,165,250,0.3)",
                      background: "rgba(96,165,250,0.1)",
                      color: "white",
                      fontSize: r.fontSize.body,
                      marginBottom: r.spacing.medium,
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>
                      Standardstimme
                    </option>
                    {voices.length === 0 ? (
                      <option style={{ background: "rgba(0,0,0,0.9)", color: "white" }}>Wird geladen...</option>
                    ) : (
                      voices.map((v) => (
                        <option
                          key={v.voiceURI}
                          value={v.voiceURI}
                          style={{ background: "rgba(0,0,0,0.9)", color: "white" }}
                        >
                          {v.name}
                        </option>
                      ))
                    )}
                  </select>

                  <label
                    htmlFor="tts-rate"
                    style={{
                      fontSize: r.fontSize.small,
                      opacity: 0.75,
                      fontWeight: 850,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Lesegeschwindigkeit: {ttsRate}×
                  </label>
                  <input
                    id="tts-rate"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.25"
                    value={ttsRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value);
                      setTtsRate(rate);
                      localStorage.setItem("rv-tts-rate", rate.toString());
                    }}
                    aria-valuetext={`${ttsRate}x`}
                    style={{
                      width: "100%",
                      marginBottom: r.spacing.medium,
                      cursor: "pointer",
                    }}
                  />

                  <button
                    onClick={() => (isSpeaking ? stop() : speak("Willkommen bei RaumVote. Dein Raum wartet auf dich."))}
                    style={{
                      width: "100%",
                      background: isSpeaking ? "rgba(239,68,68,0.3)" : "rgba(96,165,250,0.3)",
                      border: isSpeaking ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(96,165,250,0.5)",
                      color: isSpeaking ? "rgba(239,68,68,0.95)" : "rgba(96,165,250,0.95)",
                      padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                      borderRadius: r.borderRadius.small,
                      cursor: "pointer",
                      fontSize: r.fontSize.body,
                      fontWeight: 750,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: r.spacing.medium,
                      transition: "all 0.2s ease",
                    }}
                    aria-label={isSpeaking ? "Vorlesen stoppen" : "Testvorlesen abspielen"}
                  >
                    <FontAwesomeIcon icon={faVolumeHigh} style={{ fontSize: r.fontSize.body + 2 }} />
                    {isSpeaking ? "Stopp" : "Anhören"}
                  </button>

                  <div
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                    }}
                  >
                    {isSpeaking ? "Vorlesen aktiv" : ""}
                  </div>
                </>
              )}

              <div
                style={{
                  marginTop: r.spacing.large,
                  padding: r.spacing.small,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: r.borderRadius.small,
                }}
              >
                <button
                  onClick={() => setCurrentPage("delete")}
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "rgba(239,68,68,0.9)",
                    padding: `${r.spacing.small + 2}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 700,
                    width: "100%",
                  }}
                >
                  Konto löschen
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Delete Account Page */}
        {currentPage === "delete" && (
          <div>
            <div
              style={{
                fontSize: r.fontSize.title + 2,
                fontWeight: 950,
                letterSpacing: -0.3,
                marginBottom: r.spacing.medium,
                color: "rgba(239,68,68,0.9)",
              }}
            >
              Konto löschen
            </div>
            <section
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                borderRadius: r.borderRadius.medium,
                padding: r.spacing.medium,
                backdropFilter: "blur(14px)",
              }}
            >
              <div
                style={{ fontSize: r.fontSize.body, lineHeight: 1.6, marginBottom: r.spacing.medium, opacity: 0.85 }}
              >
                <strong>Warnung:</strong> Das Löschen deines Kontos ist <strong>endgültig</strong> und kann nicht
                rückgängig gemacht werden.
                <br />
                <br />
                Folgendes wird gelöscht:
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>Dein Profilbild</li>
                  <li>Dein Benutzername</li>
                  <li>Alle Kontoeinstellungen</li>
                </ul>
                <br />
                Folgendes bleibt <strong>anonymisiert</strong> und wird nicht rückverfolgt:
                <ul style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>✓ Deine Abstimmungen (ohne Profilbezug)</li>
                  <li>✓ Deine Likes (ohne Profilbezug)</li>
                  <li>✓ Deine Kommentare (ohne Profilbezug)</li>
                </ul>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  onClick={async () => {
                    if (confirm("Bist du dir sicher? Dein Konto wird endgültig gelöscht.")) {
                      const res = await fetch("/api/me/delete", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ voterId }),
                      });
                      if (res.ok) {
                        localStorage.removeItem("voterId");
                        router.push("/denied");
                      }
                    }
                  }}
                  style={{
                    background: "rgba(239,68,68,0.3)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    color: "rgba(239,68,68,0.95)",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 800,
                  }}
                >
                  Ja, Konto wirklich löschen
                </button>
                <button
                  onClick={() => setCurrentPage("settings")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                    padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                    borderRadius: r.borderRadius.small,
                    cursor: "pointer",
                    fontSize: r.fontSize.body,
                    fontWeight: 700,
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
