"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import type { TreeNodeData } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchNodePage, generateChildren, discoverNode } from "@/lib/tree.client";
import { useSwipeChoice } from "@/lib/useSwipeChoice";

import { faHeart, faComment, faShare, faCheckToSlot } from "@fortawesome/free-solid-svg-icons";
import { ActionRail } from "@/components/ActionRail";
import { CommentBottomSheet } from "@/components/CommentBottomSheet";
import { DiscoveryRevealCard } from "@/components/DiscoveryRevealCard";
import { useAuth } from "@/lib/useAuth";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

const TREE_VERSION = "dynamic";

function isPlaceholder(url: string | null | undefined, placeholderUrl: string): boolean {
  return !url || url === placeholderUrl || url === "/media/placeholder.jpg";
}

function ImageShimmer({ label }: { label: string }) {
  return (
    <>
      <style>{`
        @keyframes rv-shimmer {
          0% { transform: translateX(-100%) rotate(15deg); }
          100% { transform: translateX(200%) rotate(15deg); }
        }
        @keyframes rv-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }
        @keyframes rv-dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
        .rv-dots::after {
          content: '';
          animation: rv-dots 1.5s steps(1) infinite;
        }
      `}</style>
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        overflow: "hidden",
        pointerEvents: "none",
      }}>
        {/* Dark pulsing overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(100,60,255,0.15) 0%, rgba(0,0,0,0.6) 70%)",
          animation: "rv-pulse 3s ease-in-out infinite",
        }} />
        {/* Shimmer sweep */}
        <div style={{
          position: "absolute",
          inset: 0,
        }}>
          <div style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "60%",
            height: "200%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)",
            animation: "rv-shimmer 2.5s ease-in-out infinite",
          }} />
        </div>
        {/* Label */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "rgba(255,255,255,0.8)",
            animation: "rv-pulse 1s linear infinite",
          }} />
          <span className="rv-dots" style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}>{label}</span>
        </div>
      </div>
    </>
  );
}

export default function NodePage() {
  const router = useRouter();
  const params = useParams<{ nodeId: string }>();
  const { voterId } = useAuth();
  const { isOpen } = useSession();
  const r = useResponsive();

  const nodeId = params.nodeId;

  const [treeId, setTreeId] = useState("");
  const [placeholderUrl, setPlaceholderUrl] = useState("/media/placeholder.jpg");
  const [node, setNode] = useState<TreeNodeData | null>(null);
  const [left, setLeft] = useState<TreeNodeData | null>(null);
  const [right, setRight] = useState<TreeNodeData | null>(null);

  const [generating, setGenerating] = useState(false);
  const [discoveryDisabled, setDiscoveryDisabled] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealNode, setRevealNode] = useState<TreeNodeData | null>(null);
  const [isDiscoverer, setIsDiscoverer] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [skipImages, setSkipImages] = useState(false);

  const [likedLeft, setLikedLeft] = useState(false);
  const [likedRight, setLikedRight] = useState(false);
  const [likeCountLeft, setLikeCountLeft] = useState(0);
  const [likeCountRight, setLikeCountRight] = useState(0);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [commentCountLeft, setCommentCountLeft] = useState(0);
  const [commentCountRight, setCommentCountRight] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentModalOptionId, setCommentModalOptionId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<0 | 1>(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);

  // Stable ref for placeholderUrl to avoid dep issues
  const phRef = useRef(placeholderUrl);
  phRef.current = placeholderUrl;

  // Fetch tree meta
  useEffect(() => {
    fetchActiveTreeMeta().then((meta) => {
      setTreeId(meta.treeId);
      setPlaceholderUrl(meta.placeholderUrl);
    });
  }, []);

  // Fetch node + children
  useEffect(() => {
    if (!nodeId) return;
    fetchNodePage(nodeId).then((data) => {
      if (!data) return;
      setNode(data.node);
      setLeft(data.left);
      setRight(data.right);

      // Check if existing children have placeholder images
      if (data.left && data.right) {
        const lp = isPlaceholder(data.left.mediaUrl, phRef.current);
        const rp = isPlaceholder(data.right.mediaUrl, phRef.current);
        if (lp || rp) setImagesLoading(true);
      }

      // If not generated yet, trigger generation
      if (!data.node.generated && voterId) {
        setGenerating(true);
        generateChildren(nodeId, voterId).then((gen) => {
          setNode(gen.node);
          setLeft(gen.left);
          setRight(gen.right);
          setGenerating(false);
          if (gen.isDiscoverer) {
            setIsDiscoverer(true);
            setRevealNode(gen.node);
            setShowReveal(true);
          }
          // Images will be placeholders since generation is now async — start polling
          if (gen.left && gen.right) {
            const lp = isPlaceholder(gen.left.mediaUrl, phRef.current);
            const rp = isPlaceholder(gen.right.mediaUrl, phRef.current);
            if (lp || rp) setImagesLoading(true);
          }
        }).catch((err) => {
          setGenerating(false);
          if (err?.status === 403) setDiscoveryDisabled(true);
        });
      }
    });
  }, [nodeId, voterId]);

  // Poll for image updates
  useEffect(() => {
    if (!imagesLoading || skipImages || !left || !right) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tree/node/images?leftId=${encodeURIComponent(left.id)}&rightId=${encodeURIComponent(right.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        let leftDone = false;
        let rightDone = false;
        if (data.left?.mediaUrl && !isPlaceholder(data.left.mediaUrl, phRef.current)) {
          setLeft((prev) => prev ? { ...prev, mediaUrl: data.left.mediaUrl } : prev);
          leftDone = true;
        }
        if (data.right?.mediaUrl && !isPlaceholder(data.right.mediaUrl, phRef.current)) {
          setRight((prev) => prev ? { ...prev, mediaUrl: data.right.mediaUrl } : prev);
          rightDone = true;
        }
        if (leftDone && rightDone) {
          setImagesLoading(false);
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [imagesLoading, skipImages, left?.id, right?.id]);

  // Fetch interaction states (likes, votes, comments)
  useEffect(() => {
    if (!treeId || !voterId || !left || !right) return;
    (async () => {
      const [l1, l2, v, c1, c2, cc1, cc2] = await Promise.all([
        fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(left.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(right.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
        fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
        fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
        fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
      ]);
      setLikedLeft(!!l1.liked);
      setLikedRight(!!l2.liked);
      setLikeCountLeft(c1.count ?? 0);
      setLikeCountRight(c2.count ?? 0);
      setVotedOptionId(v.optionId ?? null);
      setCommentCountLeft(cc1.count ?? 0);
      setCommentCountRight(cc2.count ?? 0);
    })();
  }, [treeId, voterId, left, right]);

  async function vote(optionId: string) {
    if (!voterId) return;
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId, treeVersion: TREE_VERSION, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) setVotedOptionId(data.optionId ?? null);
  }

  async function toggleLike(optionId: string) {
    if (!voterId) return;
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId, treeVersion: TREE_VERSION, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.liked === undefined) return;
    if (left?.id === optionId) {
      setLikedLeft(!!data.liked);
      setLikeCountLeft((c) => c + (data.liked ? 1 : -1));
    }
    if (right?.id === optionId) {
      setLikedRight(!!data.liked);
      setLikeCountRight((c) => c + (data.liked ? 1 : -1));
    }
  }

  function openComments(optionId: string) {
    setCommentModalOptionId(optionId);
    setCommentModalOpen(true);
  }

  function closeComments() {
    setCommentModalOpen(false);
    if (!treeId || !left || !right) return;
    Promise.all([
      fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
      fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${TREE_VERSION}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
    ]).then(([cc1, cc2]) => {
      setCommentCountLeft(cc1.count ?? 0);
      setCommentCountRight(cc2.count ?? 0);
    });
  }

  async function shareOption(optionId: string) {
    const url = `${window.location.origin}/o/${encodeURIComponent(optionId)}`;
    if (navigator.share) {
      await navigator.share({ title: "RaumVote", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const navigate = useCallback((child: TreeNodeData) => {
    router.push(`/n/${child.id}`);
  }, [router]);

  function handleExplore() {
    if (!voterId || !revealNode) return;
    discoverNode(revealNode.id, voterId);
    setShowReveal(false);
  }

  const isPortrait = r.breakpoint === "small";

  // Landscape/large swipe — navigates into child
  const swipe = useSwipeChoice({
    onChoice: (c) => {
      if (!left || !right) return;
      navigate(c === "left" ? left : right);
    },
    thresholdPx: 70,
  });

  // Portrait carousel — drag tracking for smooth transitions
  function onCarouselPointerDown(e: React.PointerEvent) {
    dragStartRef.current = { x: e.clientX, y: e.clientY, axis: null };
    setIsDragging(true);
    setDragOffset(0);
  }

  function onCarouselPointerMove(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Decide axis after 10px movement
    if (!dragStartRef.current.axis) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        dragStartRef.current.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }
    }

    if (dragStartRef.current.axis === "x") {
      // Dampen drag at edges (card 0 swiping right, or card 1 swiping left)
      let offset = dx;
      if ((activeCard === 0 && dx > 0) || (activeCard === 1 && dx < 0)) {
        offset = dx * 0.3; // rubber band effect
      }
      setDragOffset(offset);
    }
  }

  function onCarouselPointerUp(e: React.PointerEvent) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const axis = dragStartRef.current.axis;

    dragStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);

    // Vertical swipe up — navigate into subtree
    if (axis === "y" && dy < -70) {
      if (left && right) {
        navigate(activeCard === 0 ? left : right);
      }
      return;
    }

    // Horizontal swipe — switch card
    if (axis === "x") {
      if (dx < -50 && activeCard === 0) setActiveCard(1);
      else if (dx > 50 && activeCard === 1) setActiveCard(0);
    }
  }

  const carouselBind = {
    onPointerDown: onCarouselPointerDown,
    onPointerMove: onCarouselPointerMove,
    onPointerUp: onCarouselPointerUp,
    onPointerCancel: onCarouselPointerUp,
  };

  // Loading state — AI text generation
  if (!node || generating) {
    return (
      <>
        <style>{`
          @keyframes rv-ripple {
            100% { box-shadow: 0 0 0 40px #0000; }
          }
        `}</style>
        <div style={{ position: "fixed", inset: 0, background: "black", color: "white", zIndex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", padding: r.spacing.medium }}>
            <div style={{
              width: 20,
              aspectRatio: "1",
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 0 0 0 rgba(255,255,255,0.25)",
              animation: "rv-ripple 1.5s infinite linear",
              position: "relative",
              margin: "0 auto 32px",
            }}>
              <div style={{
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                boxShadow: "0 0 0 0 rgba(255,255,255,0.25)",
                animation: "rv-ripple 1.5s infinite linear",
                animationDelay: "-0.5s",
              }} />
              <div style={{
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                boxShadow: "0 0 0 0 rgba(255,255,255,0.25)",
                animation: "rv-ripple 1.5s infinite linear",
                animationDelay: "-1s",
              }} />
            </div>
            <div style={{ fontSize: r.fontSize.title, fontWeight: 900, marginBottom: 8 }}>
              {generating ? "Generating" : "Loading"}
            </div>
            {generating && (
              <div style={{ fontSize: r.fontSize.small, opacity: 0.5, maxWidth: 220, margin: "0 auto" }}>
                AI is creating new paths for you
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Discovery disabled
  if (discoveryDisabled && !left && !right) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "black", color: "white", zIndex: 1, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: r.spacing.medium, maxWidth: r.maxWidth }}>
          <div style={{ fontSize: r.fontSize.title + 4, fontWeight: 950, letterSpacing: -0.3 }}>{node.titel}</div>
          <div style={{ fontSize: r.fontSize.body, opacity: 0.7, marginTop: 10 }}>{node.beschreibung}</div>
          <div style={{ fontSize: r.fontSize.small, opacity: 0.4, marginTop: 16, padding: "8px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            Entdeckung ist derzeit pausiert
          </div>
        </div>
      </div>
    );
  }

  // If node has no children yet and we're not generating (no voterId), show node info
  if (!left || !right) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "black", color: "white", zIndex: 1, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: r.spacing.medium, maxWidth: r.maxWidth }}>
          <div style={{ fontSize: r.fontSize.title + 4, fontWeight: 950, letterSpacing: -0.3 }}>{node.titel}</div>
          <div style={{ fontSize: r.fontSize.body, opacity: 0.7, marginTop: 10 }}>{node.beschreibung}</div>
          <div style={{ fontSize: r.fontSize.small, opacity: 0.5, marginTop: 8 }}>{node.context}</div>
        </div>
      </div>
    );
  }

  const isMed = r.breakpoint === "medium";
  const leftIsPlaceholder = isPlaceholder(left.mediaUrl, placeholderUrl);
  const rightIsPlaceholder = isPlaceholder(right.mediaUrl, placeholderUrl);
  const showShimmer = imagesLoading && !skipImages;

  const options = [left, right];
  const likedStates = [likedLeft, likedRight];
  const likeCounts = [likeCountLeft, likeCountRight];
  const commentCounts = [commentCountLeft, commentCountRight];
  const placeholderStates = [leftIsPlaceholder, rightIsPlaceholder];

  const styles = {
    shell: {
      position: "fixed" as const,
      inset: 0,
      background: "black",
      display: "grid",
      placeItems: "center",
      overflow: "hidden",
      zIndex: 1,
    },
    frame: {
      position: "relative" as const,
      width: r.maxWidth,
      height: "100%",
      overflow: "hidden",
    },
    top: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      padding: isMed ? 10 : r.spacing.medium,
      zIndex: 5,
      background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
      color: "white",
    },
    split: {
      position: "absolute" as const,
      inset: 0,
      display: "grid",
      gridTemplateColumns: "1fr 2px 1fr",
    },
    half: {
      position: "relative" as const,
      border: "none",
      background: "transparent",
      overflow: "hidden",
      cursor: "pointer",
    },
    overlay: {
      position: "absolute" as const,
      left: 0,
      right: 0,
      bottom: 0,
      padding: isMed ? 8 : r.spacing.medium,
      paddingBottom: r.tabbarHeight + (isMed ? 8 : 18),
      color: "white",
      background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
    },
  };

  // ====== PORTRAIT CAROUSEL MODE ======
  if (isPortrait) {
    return (
      <main style={styles.shell}>
        <div style={{ ...styles.frame, touchAction: "none" }} {...carouselBind}>
          {/* Question header */}
          <header style={{ ...styles.top, zIndex: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: r.fontSize.small, opacity: 0.7 }}>
                  RaumVote • Depth {node.depth}
                </div>
                <div style={{ fontSize: r.fontSize.button, fontWeight: 900 }}>{node.question}</div>
              </div>
              {showShimmer && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSkipImages(true); }}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    cursor: "pointer",
                    flexShrink: 0,
                    marginLeft: 8,
                    marginTop: 2,
                  }}
                >
                  Skip
                </button>
              )}
            </div>
          </header>

          {/* Carousel track */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            transform: `translateX(calc(${-activeCard * 100}% + ${dragOffset}px))`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}>
            {options.map((opt, i) => (
              <div key={opt.id} style={{
                position: "relative",
                width: "100%",
                height: "100%",
                flexShrink: 0,
              }}>
                <Image src={opt.mediaUrl || placeholderUrl} alt={opt.titel} fill priority style={{ objectFit: "cover" }} />
                {showShimmer && placeholderStates[i] && <ImageShimmer label="Creating" />}

                {/* Bottom overlay */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: r.spacing.medium,
                  paddingBottom: r.tabbarHeight + 18,
                  color: "white",
                  background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 100%)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: r.fontSize.title + 2, fontWeight: 900, letterSpacing: -0.3 }}>{opt.titel}</div>
                      <div style={{ fontSize: r.fontSize.body, opacity: 0.8, marginTop: 6 }}>{opt.beschreibung}</div>

                      {/* Swipe up hint */}
                      <div style={{
                        marginTop: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: 0.5,
                        fontSize: r.fontSize.small,
                      }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>↑</span>
                        <span>Nach oben wischen zum Erkunden</span>
                      </div>
                    </div>
                    <ActionRail disabled={!isOpen} items={[
                      { icon: faHeart, active: likedStates[i], count: likeCounts[i], onClick: () => toggleLike(opt.id) },
                      { icon: faCheckToSlot, active: votedOptionId === opt.id, activeColor: "#60a5fa", onClick: () => vote(opt.id) },
                      { icon: faComment, count: commentCounts[i], onClick: () => openComments(opt.id) },
                      { icon: faShare, onClick: () => shareOption(opt.id) },
                    ]} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div style={{
            position: "absolute",
            bottom: r.tabbarHeight + 4,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            zIndex: 10,
          }}>
            {[0, 1].map((i) => (
              <button
                key={i}
                onClick={() => setActiveCard(i as 0 | 1)}
                style={{
                  width: activeCard === i ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: "none",
                  background: activeCard === i ? "white" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {showReveal && revealNode && (
          <DiscoveryRevealCard
            titel={revealNode.titel}
            beschreibung={revealNode.beschreibung}
            context={revealNode.context}
            isFirstExplorer={isDiscoverer}
            onExplore={handleExplore}
            onLater={() => setShowReveal(false)}
          />
        )}

        {voterId && commentModalOptionId && (
          <CommentBottomSheet
            isOpen={commentModalOpen}
            onClose={closeComments}
            treeId={treeId}
            treeVersion={TREE_VERSION}
            optionId={commentModalOptionId}
            voterId={voterId}
            readOnly={!isOpen}
          />
        )}
      </main>
    );
  }

  // ====== LANDSCAPE / LARGE SPLIT MODE ======
  return (
    <main style={styles.shell}>
      <div style={styles.frame} {...swipe.bind()}>
        <header style={styles.top}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: r.fontSize.small, opacity: 0.7 }}>
                RaumVote • Depth {node.depth}
              </div>
              <div style={{ fontSize: r.fontSize.button, fontWeight: 900 }}>{node.question}</div>
            </div>
            {showShimmer && (
              <button
                onClick={(e) => { e.stopPropagation(); setSkipImages(true); }}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: 8,
                  marginTop: 2,
                }}
              >
                Skip
              </button>
            )}
          </div>
        </header>

        <section style={styles.split}>
          {/* LEFT */}
          <div role="button" tabIndex={0} style={styles.half} onClick={() => navigate(left)}>
            <Image src={left.mediaUrl || placeholderUrl} alt={left.titel} fill priority style={{ objectFit: "cover" }} />
            {showShimmer && leftIsPlaceholder && <ImageShimmer label="Creating" />}
            <div style={styles.overlay}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: r.fontSize.title, fontWeight: 900, letterSpacing: -0.3 }}>{left.titel}</div>
                  <div style={{ fontSize: r.fontSize.body - 1, opacity: 0.8, marginTop: isMed ? 2 : 6 }}>{left.beschreibung}</div>
                </div>
                <ActionRail disabled={!isOpen} items={[
                  { icon: faHeart, active: likedLeft, count: likeCountLeft, onClick: () => toggleLike(left.id) },
                  { icon: faCheckToSlot, active: votedOptionId === left.id, activeColor: "#60a5fa", onClick: () => vote(left.id) },
                  { icon: faComment, count: commentCountLeft, onClick: () => openComments(left.id) },
                  { icon: faShare, onClick: () => shareOption(left.id) },
                ]} />
              </div>
            </div>
          </div>

          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />

          {/* RIGHT */}
          <div role="button" tabIndex={0} style={styles.half} onClick={() => navigate(right)}>
            <Image src={right.mediaUrl || placeholderUrl} alt={right.titel} fill priority style={{ objectFit: "cover" }} />
            {showShimmer && rightIsPlaceholder && <ImageShimmer label="Creating" />}
            <div style={styles.overlay}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: r.fontSize.title, fontWeight: 900, letterSpacing: -0.3 }}>{right.titel}</div>
                  <div style={{ fontSize: r.fontSize.body - 1, opacity: 0.8, marginTop: isMed ? 2 : 6 }}>{right.beschreibung}</div>
                </div>
                <ActionRail disabled={!isOpen} items={[
                  { icon: faHeart, active: likedRight, count: likeCountRight, onClick: () => toggleLike(right.id) },
                  { icon: faCheckToSlot, active: votedOptionId === right.id, activeColor: "#60a5fa", onClick: () => vote(right.id) },
                  { icon: faComment, count: commentCountRight, onClick: () => openComments(right.id) },
                  { icon: faShare, onClick: () => shareOption(right.id) },
                ]} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Discovery Reveal Card */}
      {showReveal && revealNode && (
        <DiscoveryRevealCard
          titel={revealNode.titel}
          beschreibung={revealNode.beschreibung}
          context={revealNode.context}
          isFirstExplorer={isDiscoverer}
          onExplore={handleExplore}
          onLater={() => setShowReveal(false)}
        />
      )}

      {voterId && commentModalOptionId && (
        <CommentBottomSheet
          isOpen={commentModalOpen}
          onClose={closeComments}
          treeId={treeId}
          treeVersion={TREE_VERSION}
          optionId={commentModalOptionId}
          voterId={voterId}
          readOnly={!isOpen}
        />
      )}
    </main>
  );
}
