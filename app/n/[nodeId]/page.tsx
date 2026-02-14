"use client";

import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Node, Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchNode, fetchOption } from "@/lib/tree.client";
import { useSwipeChoice } from "@/lib/useSwipeChoice";

import { faHeart, faComment, faShare, faCheckToSlot } from "@fortawesome/free-solid-svg-icons";
import { ActionRail } from "@/components/ActionRail";
import { CommentBottomSheet } from "@/components/CommentBottomSheet";
import { useAuth } from "@/lib/useAuth";
import { useSession } from "@/lib/useSession";
import { useResponsive } from "@/lib/useResponsive";

export default function NodePage() {
    const router = useRouter();
    const params = useParams<{ nodeId: string }>();
    const sp = useSearchParams();
    const { voterId } = useAuth();
    const { isOpen } = useSession();
    const r = useResponsive();

    const [treeId, setTreeId] = useState(sp.get("t") ?? "");
    const [treeVersion, setTreeVersion] = useState(sp.get("v") ?? "");

    const [node, setNode] = useState<Node | null>(null);
    const [leftOption, setLeftOption] = useState<Option | null>(null);
    const [rightOption, setRightOption] = useState<Option | null>(null);

    const [likedLeft, setLikedLeft] = useState(false);
    const [likedRight, setLikedRight] = useState(false);
    const [likeCountLeft, setLikeCountLeft] = useState(0);
    const [likeCountRight, setLikeCountRight] = useState(0);
    const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
    const [commentCountLeft, setCommentCountLeft] = useState(0);
    const [commentCountRight, setCommentCountRight] = useState(0);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentModalOptionId, setCommentModalOptionId] = useState<string | null>(null);

    const nodeId = params.nodeId;

    useEffect(() => {
        if (treeId && treeVersion) return;
        fetchActiveTreeMeta().then((meta) => {
            setTreeId(meta.treeId);
            setTreeVersion(meta.version);
            router.replace(`/n/${nodeId}?t=${meta.treeId}&v=${meta.version}`);
        });
    }, [treeId, treeVersion, nodeId, router]);

    useEffect(() => {
        if (!treeId) return;
        fetchNode(treeId, nodeId).then((n) => {
            setNode(n);
            fetchOption(treeId, n.leftOptionId).then(setLeftOption);
            fetchOption(treeId, n.rightOptionId).then(setRightOption);
        });
    }, [treeId, nodeId]);

    useEffect(() => {
        if (!treeId || !treeVersion || !voterId || !leftOption || !rightOption) return;
        (async () => {
            const [l1, l2, v, c1, c2, cc1, cc2] = await Promise.all([
                fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}`).then(r => r.json()),
                fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}`).then(r => r.json()),
                fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}`).then(r => r.json()),
                fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}`).then(r => r.json()),
            ]);
            setLikedLeft(!!l1.liked);
            setLikedRight(!!l2.liked);
            setLikeCountLeft(c1.count ?? 0);
            setLikeCountRight(c2.count ?? 0);
            setVotedOptionId(v.optionId ?? null);
            setCommentCountLeft(cc1.count ?? 0);
            setCommentCountRight(cc2.count ?? 0);
        })();
    }, [treeId, treeVersion, voterId, leftOption, rightOption]);

    async function vote(optionId: string) {
        if (!voterId) return;
        const res = await fetch("/api/vote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ treeId, treeVersion, voterId, optionId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) setVotedOptionId(data.optionId ?? null);
    }

    async function toggleLike(optionId: string) {
        if (!voterId) return;
        const res = await fetch("/api/like", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ treeId, treeVersion, voterId, optionId }),
        });
        const data = await res.json().catch(() => null);
        if (data?.liked === undefined) return;
        if (leftOption?.id === optionId) {
            setLikedLeft(!!data.liked);
            setLikeCountLeft((c) => c + (data.liked ? 1 : -1));
        }
        if (rightOption?.id === optionId) {
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
        if (!treeId || !treeVersion || !leftOption || !rightOption) return;
        Promise.all([
            fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}`).then(r => r.json()),
            fetch(`/api/comment/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}`).then(r => r.json()),
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

    function navigate(option: Option) {
        if (option.nextNodeId) {
            router.push(`/n/${option.nextNodeId}?t=${treeId}&v=${treeVersion}`);
        } else if (option.isEnd) {
            router.push(`/o/${option.id}`);
        }
    }

    const swipe = useSwipeChoice({
        onChoice: (c) => {
            if (!leftOption || !rightOption) return;
            navigate(c === "left" ? leftOption : rightOption);
        },
        thresholdPx: 70,
    });

    if (!node || !leftOption || !rightOption) {
        return (
            <div style={{ padding: 16, color: "white", background: "black", height: "100dvh" }}>
                Loading…
            </div>
        );
    }

    const isMed = r.breakpoint === "medium";

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

    return (
        <main style={styles.shell}>
            <div style={styles.frame} {...swipe.bind()}>
                <header style={styles.top}>
                    <div>
                        <div style={{ fontSize: r.fontSize.small, opacity: 0.7 }}>
                            RaumVote • {treeId} • {treeVersion}
                        </div>
                        <div style={{ fontSize: r.fontSize.button, fontWeight: 900 }}>{node.question}</div>
                    </div>
                </header>

                <section style={styles.split}>
                    {/* LEFT */}
                    <div role="button" tabIndex={0} style={styles.half} onClick={() => navigate(leftOption)}>
                        <Image src={leftOption.mediaUrl} alt={leftOption.title} fill priority style={{ objectFit: "cover" }} />
                        <div style={styles.overlay}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: r.fontSize.title, fontWeight: 900, letterSpacing: -0.3 }}>{leftOption.title}</div>
                                    {leftOption.description && (
                                        <div style={{ fontSize: r.fontSize.body - 1, opacity: 0.8, marginTop: isMed ? 2 : 6 }}>{leftOption.description}</div>
                                    )}
                                </div>
                                <ActionRail disabled={!isOpen} items={[
                                    { icon: faHeart, active: likedLeft, count: likeCountLeft, onClick: () => toggleLike(leftOption.id) },
                                    { icon: faCheckToSlot, active: votedOptionId === leftOption.id, activeColor: "#60a5fa", onClick: () => vote(leftOption.id) },
                                    { icon: faComment, count: commentCountLeft, onClick: () => openComments(leftOption.id) },
                                    { icon: faShare, onClick: () => shareOption(leftOption.id) },
                                ]} />
                            </div>
                        </div>
                    </div>

                    <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />

                    {/* RIGHT */}
                    <div role="button" tabIndex={0} style={styles.half} onClick={() => navigate(rightOption)}>
                        <Image src={rightOption.mediaUrl} alt={rightOption.title} fill priority style={{ objectFit: "cover" }} />
                        <div style={styles.overlay}>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: r.spacing.small }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: r.fontSize.title, fontWeight: 900, letterSpacing: -0.3 }}>{rightOption.title}</div>
                                    {rightOption.description && (
                                        <div style={{ fontSize: r.fontSize.body - 1, opacity: 0.8, marginTop: isMed ? 2 : 6 }}>{rightOption.description}</div>
                                    )}
                                </div>
                                <ActionRail disabled={!isOpen} items={[
                                    { icon: faHeart, active: likedRight, count: likeCountRight, onClick: () => toggleLike(rightOption.id) },
                                    { icon: faCheckToSlot, active: votedOptionId === rightOption.id, activeColor: "#60a5fa", onClick: () => vote(rightOption.id) },
                                    { icon: faComment, count: commentCountRight, onClick: () => openComments(rightOption.id) },
                                    { icon: faShare, onClick: () => shareOption(rightOption.id) },
                                ]} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {voterId && commentModalOptionId && (
                <CommentBottomSheet
                    isOpen={commentModalOpen}
                    onClose={closeComments}
                    treeId={treeId}
                    treeVersion={treeVersion}
                    optionId={commentModalOptionId}
                    voterId={voterId}
                    readOnly={!isOpen}
                />
            )}
        </main>
    );
}
