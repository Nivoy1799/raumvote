"use client";

import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Node, Option } from "@/lib/tree.types";
import { fetchActiveTreeMeta, fetchNode, fetchOption } from "@/lib/tree.client";
import { useSwipeChoice } from "@/lib/useSwipeChoice";

import { faHeart, faComment, faShare, faChartSimple } from "@fortawesome/free-solid-svg-icons";
import { ActionRail } from "@/components/ActionRail";

export default function NodePage() {
    const router = useRouter();
    const params = useParams<{ nodeId: string }>();
    const sp = useSearchParams();

    const [treeId, setTreeId] = useState(sp.get("t") ?? "");
    const [treeVersion, setTreeVersion] = useState(sp.get("v") ?? "");

    const [node, setNode] = useState<Node | null>(null);
    const [leftOption, setLeftOption] = useState<Option | null>(null);
    const [rightOption, setRightOption] = useState<Option | null>(null);

    const [voterId, setVoterId] = useState<string | null>(null);

    const [likedLeft, setLikedLeft] = useState(false);
    const [likedRight, setLikedRight] = useState(false);
    const [likeCountLeft, setLikeCountLeft] = useState(0);
    const [likeCountRight, setLikeCountRight] = useState(0);
    const [votedOptionId, setVotedOptionId] = useState<string | null>(null);


    const nodeId = params.nodeId;

    // voterId
    useEffect(() => {
        let id = localStorage.getItem("voterId");
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("voterId", id);
        }
        setVoterId(id);
    }, []);

    // ensure meta
    useEffect(() => {
        if (treeId && treeVersion) return;

        fetchActiveTreeMeta().then((meta) => {
            setTreeId(meta.treeId);
            setTreeVersion(meta.version);
            router.replace(
                `/n/${nodeId}?t=${meta.treeId}&v=${meta.version}`
            );
        });
    }, [treeId, treeVersion, nodeId, router]);

    // load node + options
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
            const [l1, l2, v, c1, c2] = await Promise.all([
                fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/like/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/vote/status?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&voterId=${encodeURIComponent(voterId)}`).then(r => r.json()),
                fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(leftOption.id)}`).then(r => r.json()),
                fetch(`/api/like/count?treeId=${encodeURIComponent(treeId)}&treeVersion=${encodeURIComponent(treeVersion)}&optionId=${encodeURIComponent(rightOption.id)}`).then(r => r.json()),
            ]);

            setLikedLeft(!!l1.liked);
            setLikedRight(!!l2.liked);
            setLikeCountLeft(c1.count ?? 0);
            setLikeCountRight(c2.count ?? 0);
            setVotedOptionId(v.optionId ?? null);
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
            router.push(
                `/n/${option.nextNodeId}?t=${treeId}&v=${treeVersion}`
            );
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

    return (
        <main style={s.shell}>
            <div style={s.frame} {...swipe.bind()}>
                <header style={s.top}>
                    <div>
                        <div style={s.context}>
                            RaumVote • {treeId} • {treeVersion}
                        </div>
                        <div style={s.question}>{node.question}</div>
                    </div>
                </header>

                <section style={s.split}>
                    {/* LEFT */}
                    <button style={s.half} onClick={() => navigate(leftOption)}>
                        <Image
                            src={leftOption.mediaUrl}
                            alt={leftOption.title}
                            fill
                            priority
                            style={{ objectFit: "cover" }}
                        />
                        <div style={s.overlay}>
                            <div style={s.overlayInner}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={s.title}>{leftOption.title}</div>
                                    {leftOption.description && (
                                        <div style={s.desc}>{leftOption.description}</div>
                                    )}
                                </div>
                                <ActionRail items={[
                                    { icon: faHeart, active: likedLeft, label: likeCountLeft, onClick: () => toggleLike(leftOption.id) },
                                    { icon: faChartSimple, active: votedOptionId === leftOption.id, activeColor: "#60a5fa", label: votedOptionId === leftOption.id ? "Voted" : "Vote", onClick: () => vote(leftOption.id) },
                                    { icon: faComment, onClick: () => {} },
                                    { icon: faShare, onClick: () => shareOption(leftOption.id) },
                                ]} />
                            </div>
                        </div>
                    </button>

                    <div style={s.divider} />

                    {/* RIGHT */}
                    <button style={s.half} onClick={() => navigate(rightOption)}>
                        <Image
                            src={rightOption.mediaUrl}
                            alt={rightOption.title}
                            fill
                            priority
                            style={{ objectFit: "cover" }}
                        />
                        <div style={s.overlay}>
                            <div style={s.overlayInner}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={s.title}>{rightOption.title}</div>
                                    {rightOption.description && (
                                        <div style={s.desc}>{rightOption.description}</div>
                                    )}
                                </div>
                                <ActionRail items={[
                                    { icon: faHeart, active: likedRight, label: likeCountRight, onClick: () => toggleLike(rightOption.id) },
                                    { icon: faChartSimple, active: votedOptionId === rightOption.id, activeColor: "#60a5fa", label: votedOptionId === rightOption.id ? "Voted" : "Vote", onClick: () => vote(rightOption.id) },
                                    { icon: faComment, onClick: () => {} },
                                    { icon: faShare, onClick: () => shareOption(rightOption.id) },
                                ]} />
                            </div>
                        </div>
                    </button>
                </section>
            </div>
        </main>
    );
}


const TABBAR_HEIGHT = 64;

const s: Record<string, React.CSSProperties> = {
    shell: {
        position: "fixed",
        inset: 0,
        background: "black",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        zIndex: 1,
    },
    frame: { position: "relative", width: "min(560px, 100vw)", height: "100%", overflow: "hidden" },

    top: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: 16,
        zIndex: 5,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
        color: "white",
    },

    context: { fontSize: 12, opacity: 0.7 },
    question: { fontSize: 16, fontWeight: 900 },

    split: {
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "1fr 2px 1fr",
    },

    half: { position: "relative", border: "none", background: "transparent", overflow: "hidden" },
    divider: {
        width: 1,
        background: "rgba(255,255,255,0.08)",
    },



    overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        paddingBottom: TABBAR_HEIGHT + 18,
        color: "white",
        background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",

    },

    title: {
        fontSize: 19,
        fontWeight: 900,
        letterSpacing: -0.3,
    },

    desc: { fontSize: 13, opacity: 0.8, marginTop: 6 },

    overlayInner: {
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
    },
};
