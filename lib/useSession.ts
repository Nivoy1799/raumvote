"use client";

import { useEffect, useState } from "react";

export type SessionInfo = {
  id: string;
  treeId: string;
  title: string | null;
  status: string;
  durationDays: number;
  startedAt: string | null;
  deadline: string | null;
  remainingMs: number;
  rootNodeId: string | null;
  placeholderUrl: string;
  discoveryEnabled: boolean;
};

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json();
        if (mounted) setSession(data.session ?? null);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // Refresh every 60s while active
    const interval = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const isOpen = session?.status === "active" && (session.remainingMs ?? 0) > 0;

  return { session, loading, isOpen };
}
