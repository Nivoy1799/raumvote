"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import type { TreeNodeData } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchNodePage, generateChildren, discoverNode } from "@/lib/tree.client";
import { useSwipeChoice } from "@/lib/useSwipeChoice";
import { useTTS } from "@/lib/useTTS";

import { faHeart, faComment, faShare, faCheckToSlot } from "@fortawesome/free-solid-svg-icons";
import { ActionRail } from "@/components/ActionRail";
import { CommentBottomSheet } from "@/components/CommentBottomSheet";
import { DiscoveryRevealCard, type DiscoveryVariant } from "@/components/DiscoveryRevealCard";
import { useAuth } from "@/lib/useAuth";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

const GENERATING_MESSAGES = [
  "Generiere neue Realitäten",
  "Wie könnte dein Platz noch aussehen",
  "Vibing....",
  "Feels like new home",
];

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
  const { speak } = useTTS();

  const nodeId = params.nodeId;

  const [sessionId, setSessionId] = useState("");
  const [placeholderUrl, setPlaceholderUrl] = useState("/media/placeholder.jpg");
  const [node, setNode] = useState<TreeNodeData | null>(null);
  const [left, setLeft] = useState<TreeNodeData | null>(null);
  const [right, setRight] = useState<TreeNodeData | null>(null);

  const [generating, setGenerating] = useState(false);
  const [discoveryDisabled, setDiscoveryDisabled] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealNode, setRevealNode] = useState<TreeNodeData | null>(null);
  const [isDiscoverer, setIsDiscoverer] = useState(false);
  const [totalNodes, setTotalNodes] = useState<number | undefined>(undefined);
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
  const [activeCard, setActiveCard] = useState<0 | 1 | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const [idleTilt, setIdleTilt] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeUpLearnedRef = useRef(
    typeof window !== "undefined" && (parseInt(localStorage.getItem("rv-swipeup-count") || "0", 10) || 0) >= 3
  );
  const [arrivalInfo, setArrivalInfo] = useState<string | null>(null);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const [showFirstLikeCelebration, setShowFirstLikeCelebration] = useState(false);
  const [showFirstVoteCelebration, setShowFirstVoteCelebration] = useState(false);

  // Speak node question via TTS
  useEffect(() => {
    if (node?.question) {
      speak(node.question);
    }
  }, [nodeId, node?.question, speak]);

  // Cycle generating messages
  useEffect(() => {
    if (!generating) { setGenMsgIdx(0); return; }
    const iv = setInterval(() => setGenMsgIdx((i) => (i + 1) % GENERATING_MESSAGES.length), 2800);
    return () => clearInterval(iv);
  }, [generating]);

  // Stable ref for placeholderUrl to avoid dep issues
  const phRef = useRef(placeholderUrl);
  phRef.current = placeholderUrl;

  // Fetch tree meta
  useEffect(() => {
    fetchActiveTreeMeta().then((meta) => {
      setSessionId(meta.sessionId);
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
          if (gen.totalNodes !== undefined) {
            setTotalNodes(gen.totalNodes);
          }
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
      } else if (data.node.generated && !data.node.discoveredAt && voterId) {
        // Pre-generated but undiscovered — first human visitor gets discovery reveal
        setIsDiscoverer(true);
        setRevealNode(data.node);
        setShowReveal(true);
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
    if (!sessionId || !voterId || !left || !right) return;
    (async () => {
      const [l1, l2, v, c1, c2, cc1, cc2] = await Promise.all([
        fetch(`/api/like/status?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(left.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/like/status?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(right.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/vote/status?sessionId=${encodeURIComponent(sessionId)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
        fetch(`/api/like/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
        fetch(`/api/like/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
        fetch(`/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
        fetch(`/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
      ]);
      setLikedLeft(!!l1.liked);
      setLikedRight(!!l2.liked);
      setLikeCountLeft(c1.count ?? 0);
      setLikeCountRight(c2.count ?? 0);
      setVotedOptionId(v.optionId ?? null);
      setCommentCountLeft(cc1.count ?? 0);
      setCommentCountRight(cc2.count ?? 0);
    })();
  }, [sessionId, voterId, left, right]);

  async function vote(optionId: string) {
    if (!voterId) return;
    const vibOff = localStorage.getItem("rv-vibration-disabled") === "1";
    if (!vibOff) navigator.vibrate?.([20, 10, 20]);
    const isFirstVote = typeof window !== "undefined" && !localStorage.getItem("rv-first-vote-done");
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, voterId, optionId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setVotedOptionId(data.optionId ?? null);
      if (isFirstVote) {
        localStorage.setItem("rv-first-vote-done", "1");
        setShowFirstVoteCelebration(true);
        setTimeout(() => setShowFirstVoteCelebration(false), 4000);
      }
    }
  }

  async function toggleLike(optionId: string) {
    if (!voterId) return;
    const vibOff = localStorage.getItem("rv-vibration-disabled") === "1";
    if (!vibOff) navigator.vibrate?.(30);
    const isFirstLike = typeof window !== "undefined" && !localStorage.getItem("rv-first-like-done");
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, voterId, optionId }),
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
    if (data?.liked && isFirstLike) {
      localStorage.setItem("rv-first-like-done", "1");
      setShowFirstLikeCelebration(true);
      setTimeout(() => setShowFirstLikeCelebration(false), 4000);
    }
  }

  function openComments(optionId: string) {
    const vibOff = localStorage.getItem("rv-vibration-disabled") === "1";
    if (!vibOff) navigator.vibrate?.(15);
    setCommentModalOptionId(optionId);
    setCommentModalOpen(true);
  }

  function closeComments() {
    setCommentModalOpen(false);
    if (!sessionId || !left || !right) return;
    Promise.all([
      fetch(`/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(left.id)}`).then(r => r.json()),
      fetch(`/api/comment/count?sessionId=${encodeURIComponent(sessionId)}&optionId=${encodeURIComponent(right.id)}`).then(r => r.json()),
    ]).then(([cc1, cc2]) => {
      setCommentCountLeft(cc1.count ?? 0);
      setCommentCountRight(cc2.count ?? 0);
    });
  }

  async function shareOption(optionId: string) {
    const vibOff = localStorage.getItem("rv-vibration-disabled") === "1";
    if (!vibOff) navigator.vibrate?.(20);
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

  function handleLater() {
    // Also mark as discovered so the card doesn't show again on revisit
    if (voterId && revealNode) {
      discoverNode(revealNode.id, voterId);
    }
    setShowReveal(false);
  }

  // Determine discovery reveal variant
  const revealVariant: DiscoveryVariant = (() => {
    if (!revealNode) return "new";
    if (revealNode.depth >= 5 && isDiscoverer) return "rare";
    if (isDiscoverer) return "new";
    return "visited";
  })();

  const isPortrait = r.breakpoint === "small";

  // Idle tilt hint — start after 3s of no interaction (only when on a card, not center)
  function resetIdleTimer() {
    setIdleTilt(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (activeCard !== null) {
      idleTimerRef.current = setTimeout(() => setIdleTilt(true), 3000);
    }
  }

  // Reset to center view when navigating to a new node + show arrival info
  useEffect(() => {
    setActiveCard(null);
    const dir = sessionStorage.getItem("rv-arrival-direction");
    if (dir) {
      sessionStorage.removeItem("rv-arrival-direction");
      setArrivalInfo(dir);
      setTimeout(() => setArrivalInfo(null), 3500);
    }
  }, [nodeId]);

  useEffect(() => {
    if (isPortrait && left && right) {
      resetIdleTimer();
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortrait, left?.id, right?.id, activeCard]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when comment modal is open or data is not loaded
      if (commentModalOpen || !left || !right) return;

      const isPortraitMode = r.breakpoint === "small";
      const key = e.key.toLowerCase();

      // Landscape mode: simple left/right navigation
      if (!isPortraitMode) {
        if (key === "arrowleft") {
          e.preventDefault();
          navigate(left);
        } else if (key === "arrowright") {
          e.preventDefault();
          navigate(right);
        }
        return;
      }

      // Portrait mode: based on activeCard state
      if (activeCard === null) {
        // Center view: arrow keys to focus cards (0=left card, 1=right card)
        if (key === "arrowleft") {
          e.preventDefault();
          setActiveCard(0);
        } else if (key === "arrowright") {
          e.preventDefault();
          setActiveCard(1);
        }
      } else {
        // Card focused: navigation and action keys
        const focusedCard = activeCard === 0 ? left : right;
        const focusedOptionId = focusedCard.id;

        if (key === "arrowup" || key === "enter") {
          e.preventDefault();
          navigate(focusedCard);
        } else if (key === "arrowdown" || key === "escape") {
          e.preventDefault();
          setActiveCard(null);
        } else if (key === "l") {
          e.preventDefault();
          toggleLike(focusedOptionId);
        } else if (key === "v") {
          e.preventDefault();
          vote(focusedOptionId);
        } else if (key === "c") {
          e.preventDefault();
          openComments(focusedOptionId);
        } else if (key === "s") {
          e.preventDefault();
          shareOption(focusedOptionId);
        } else if (key === "arrowleft" && activeCard === 1) {
          e.preventDefault();
          setActiveCard(0);
        } else if (key === "arrowright" && activeCard === 0) {
          e.preventDefault();
          setActiveCard(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [left, right, activeCard, commentModalOpen, r.breakpoint, navigate, toggleLike, vote, openComments, shareOption]);

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
    resetIdleTimer();
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
      let offset = dx;
      // Rubber band at hard edges only (card 0 swiping further right, card 1 swiping further left)
      if ((activeCard === 0 && dx > 0) || (activeCard === 1 && dx < 0)) {
        offset = dx * 0.3;
      }
      // From center, both directions feel natural — no dampening
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

    // Vertical swipe up — navigate into subtree (only when focused on a card)
    if (axis === "y" && dy < -70 && activeCard !== null) {
      if (left && right) {
        const count = (parseInt(localStorage.getItem("rv-swipeup-count") || "0", 10) || 0) + 1;
        localStorage.setItem("rv-swipeup-count", String(count));
        swipeUpLearnedRef.current = count >= 3;
        const target = activeCard === 0 ? left : right;
        sessionStorage.setItem("rv-arrival-direction", target.titel);
        navigate(target);
      }
      return;
    }

    // Horizontal swipe — switch card
    if (axis === "x") {
      if (activeCard === null) {
        // From center: swipe right → card 0 (left option), swipe left → card 1 (right option)
        if (dx > 40) { setActiveCard(0); resetIdleTimer(); }
        else if (dx < -40) { setActiveCard(1); resetIdleTimer(); }
      } else if (activeCard === 0) {
        if (dx < -50) { setActiveCard(1); resetIdleTimer(); }
      } else if (activeCard === 1) {
        if (dx > 50) { setActiveCard(0); resetIdleTimer(); }
      }
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
              {generating ? GENERATING_MESSAGES[genMsgIdx] : "Loading"}
            </div>
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
    // Transform calculation: null=center (50/50), 0=left card, 1=right card
    const trackGap = 12;
    const carouselTranslateX =
      activeCard === null ? `calc(-50% - ${trackGap / 2}px)` :
      activeCard === 0 ? "0%" :
      `calc(-100% - ${trackGap}px)`;

    const isFocused = activeCard !== null;
    const contentOpacity = isFocused ? 1 : 0;

    return (
      <main style={styles.shell}>
        <style>{`
          @keyframes rv-tilt-hint {
            0%, 100% { transform: translateX(calc(${activeCard === null ? "-50% - 6px" : `${-(activeCard ?? 0) * 100}%`})) translateY(0); }
            50% { transform: translateX(calc(${activeCard === null ? "-50% - 6px" : `${-(activeCard ?? 0) * 100}%`})) translateY(-12px); }
          }
          @keyframes rv-swipe-up-hint {
            0%, 15% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(-10px); opacity: 1; }
            85%, 100% { transform: translateY(0); opacity: 0; }
          }
          @keyframes rv-nudge-left {
            0%, 100% { transform: translateX(0); opacity: 0.5; }
            50% { transform: translateX(-6px); opacity: 0.8; }
          }
          @keyframes rv-nudge-right {
            0%, 100% { transform: translateX(0); opacity: 0.5; }
            50% { transform: translateX(6px); opacity: 0.8; }
          }
          @keyframes rv-toast-in {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes rv-center-wobble {
            0%, 100% { transform: translateX(0); }
            30% { transform: translateX(-3px); }
            70% { transform: translateX(3px); }
          }
        `}</style>
        <div style={{ ...styles.frame, touchAction: "none" }} {...carouselBind}>
          {/* Question header — visible when focused */}
          <header style={{
            ...styles.top,
            zIndex: 10,
            opacity: contentOpacity,
            transition: "opacity 0.4s ease",
            pointerEvents: isFocused ? "auto" : "none",
          }}>
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

          {/* Arrival info toast — shown briefly after navigating deeper */}
          {arrivalInfo && (
            <div style={{
              position: "absolute",
              top: 14,
              left: 20,
              right: 20,
              zIndex: 12,
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 14,
              padding: "12px 16px",
              color: "white",
              textAlign: "center",
              pointerEvents: "none",
              animation: "rv-toast-in 0.3s ease-out",
            }}>
              <div style={{ fontSize: r.fontSize.body, fontWeight: 800 }}>
                Richtung: {arrivalInfo}
              </div>
              <div style={{ fontSize: r.fontSize.small, opacity: 0.6, marginTop: 4 }}>
                Wische zur Seite um beide Optionen zu sehen
              </div>
            </div>
          )}

          {/* Center hint — visible only when in 50/50 view */}
          {!isFocused && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              pointerEvents: "none",
              gap: 16,
            }}>
              {/* Left arrow */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, animation: "rv-nudge-left 2s ease-in-out infinite" }}>
                <path d="M15 4l-8 8 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: r.fontSize.title + 2,
                  fontWeight: 950,
                  letterSpacing: 0.3,
                  opacity: 0.9,
                  textShadow: "0 2px 12px rgba(0,0,0,0.9)",
                }}>
                  Wische zur Seite
                </div>
              </div>
              {/* Right arrow */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, animation: "rv-nudge-right 2s ease-in-out infinite" }}>
                <path d="M9 4l8 8-8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* Carousel track */}
          <div style={{
            position: "absolute",
            top: 12,
            left: 10,
            right: 10,
            bottom: 12,
            display: "flex",
            gap: trackGap,
            transform: `translateX(calc(${carouselTranslateX} + ${isDragging ? dragOffset : 0}px))`,
            transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            animation: idleTilt && !isDragging ? "rv-tilt-hint 1.2s ease-in-out" : undefined,
          }}>
            {options.map((opt, i) => (
              <div key={opt.id} style={{
                position: "relative",
                width: "100%",
                height: "100%",
                flexShrink: 0,
                borderRadius: 24,
                overflow: "hidden",
                animation: !isFocused && !isDragging ? `rv-center-wobble 3s ease-in-out ${i * 0.4}s infinite` : undefined,
              }}>
                <Image src={opt.mediaUrl || placeholderUrl} alt={opt.titel} fill priority style={{ objectFit: "cover" }} />
                {showShimmer && placeholderStates[i] && <ImageShimmer label="Creating" />}

                {/* Swipe-up hint — visible when card is focused, hidden after learned */}
                {!swipeUpLearnedRef.current && isFocused && activeCard === i && (
                  <div style={{
                    position: "absolute",
                    top: "35%",
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    pointerEvents: "none",
                    animation: "rv-swipe-up-hint 6s ease-in-out infinite",
                  }}>
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.85 }}>
                      <path d="M12 4l-6 6h4v9h4v-9h4l-6-6z" fill="white" />
                    </svg>
                    <span style={{
                      color: "white",
                      fontSize: r.fontSize.title - 2,
                      fontWeight: 850,
                      opacity: 0.85,
                      letterSpacing: 0.3,
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    }}>
                      Nach oben wischen
                    </span>
                  </div>
                )}

                {/* Title label — always visible as a small tag in center mode */}
                {!isFocused && (
                  <div style={{
                    position: "absolute",
                    bottom: 16,
                    left: 12,
                    right: 12,
                    textAlign: "center",
                    color: "white",
                    fontSize: r.fontSize.body,
                    fontWeight: 900,
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    pointerEvents: "none",
                  }}>
                    {opt.titel}
                  </div>
                )}

                {/* Bottom overlay — only visible when card is focused */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: r.spacing.medium,
                  paddingBottom: r.tabbarHeight + 6,
                  color: "white",
                  background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 100%)",
                  borderRadius: "0 0 24px 24px",
                  opacity: contentOpacity,
                  transition: "opacity 0.4s ease",
                  pointerEvents: isFocused ? "auto" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: r.fontSize.title + 2, fontWeight: 900, letterSpacing: -0.3 }}>{opt.titel}</div>
                      <div style={{ fontSize: r.fontSize.body, opacity: 0.8, marginTop: 6 }}>{opt.beschreibung}</div>
                    </div>
                    <ActionRail disabled={!isOpen} items={[
                      { icon: faHeart, active: likedStates[i], count: likeCounts[i], ariaLabel: "Gefällt mir", onClick: () => toggleLike(opt.id) },
                      { icon: faCheckToSlot, active: votedOptionId === opt.id, activeColor: "#60a5fa", ariaLabel: "Abstimmen", onClick: () => vote(opt.id) },
                      { icon: faComment, count: commentCounts[i], ariaLabel: "Kommentare", onClick: () => openComments(opt.id) },
                      { icon: faShare, ariaLabel: "Teilen", onClick: () => shareOption(opt.id) },
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
            opacity: isFocused ? 1 : 0,
            transition: "opacity 0.4s ease",
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
            node={revealNode}
            variant={revealVariant}
            totalPaths={totalNodes}
            onExplore={handleExplore}
            onLater={handleLater}
          />
        )}

        {voterId && commentModalOptionId && (
          <CommentBottomSheet
            isOpen={commentModalOpen}
            onClose={closeComments}
            sessionId={sessionId}
            optionId={commentModalOptionId}
            voterId={voterId}
            readOnly={!isOpen}
          />
        )}

        {/* First Like Celebration */}
        {showFirstLikeCelebration && (
          <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            backdropFilter: "blur(8px)",
            animation: "rv-celebration-in 0.4s ease-out",
          }}>
            <div style={{
              textAlign: "center",
              padding: r.spacing.medium,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 24,
              maxWidth: 280,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
              <div style={{ fontSize: r.fontSize.title, fontWeight: 950, color: "black", marginBottom: 8 }}>
                Dein erstes Like!
              </div>
              <div style={{ fontSize: r.fontSize.body, color: "rgba(0,0,0,0.7)", marginBottom: 16 }}>
                Deine Likes sind jetzt sichtbar in deinem Profil unter <strong>/me</strong>
              </div>
              <button
                onClick={() => setShowFirstLikeCelebration(false)}
                style={{
                  background: "#60a5fa",
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

        {/* First Vote Celebration */}
        {showFirstVoteCelebration && (
          <div style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            backdropFilter: "blur(8px)",
            animation: "rv-celebration-in 0.4s ease-out",
          }}>
            <div style={{
              textAlign: "center",
              padding: r.spacing.medium,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 24,
              maxWidth: 280,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: r.fontSize.title, fontWeight: 950, color: "black", marginBottom: 8 }}>
                Deine erste Abstimmung!
              </div>
              <div style={{ fontSize: r.fontSize.body, color: "rgba(0,0,0,0.7)", marginBottom: 16 }}>
                Du hast dich entschieden! Erkunde weiter, um deine Reise zu formen.
              </div>
              <button
                onClick={() => setShowFirstVoteCelebration(false)}
                style={{
                  background: "#60a5fa",
                  color: "white",
                  border: "none",
                  padding: `${r.spacing.small + 4}px ${r.spacing.medium}px`,
                  borderRadius: 12,
                  fontSize: r.fontSize.body,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Vielen Dank!
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes rv-celebration-in {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
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
                  { icon: faHeart, active: likedLeft, count: likeCountLeft, ariaLabel: "Gefällt mir", onClick: () => toggleLike(left.id) },
                  { icon: faCheckToSlot, active: votedOptionId === left.id, activeColor: "#60a5fa", ariaLabel: "Abstimmen", onClick: () => vote(left.id) },
                  { icon: faComment, count: commentCountLeft, ariaLabel: "Kommentare", onClick: () => openComments(left.id) },
                  { icon: faShare, ariaLabel: "Teilen", onClick: () => shareOption(left.id) },
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
                  { icon: faHeart, active: likedRight, count: likeCountRight, ariaLabel: "Gefällt mir", onClick: () => toggleLike(right.id) },
                  { icon: faCheckToSlot, active: votedOptionId === right.id, activeColor: "#60a5fa", ariaLabel: "Abstimmen", onClick: () => vote(right.id) },
                  { icon: faComment, count: commentCountRight, ariaLabel: "Kommentare", onClick: () => openComments(right.id) },
                  { icon: faShare, ariaLabel: "Teilen", onClick: () => shareOption(right.id) },
                ]} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Discovery Reveal Card */}
      {showReveal && revealNode && (
        <DiscoveryRevealCard
          node={revealNode}
          variant={revealVariant}
          totalPaths={totalNodes}
          onExplore={handleExplore}
          onLater={handleLater}
        />
      )}

      {voterId && commentModalOptionId && (
        <CommentBottomSheet
          isOpen={commentModalOpen}
          onClose={closeComments}
          sessionId={sessionId}
          optionId={commentModalOptionId}
          voterId={voterId}
          readOnly={!isOpen}
        />
      )}
    </main>
  );
}
