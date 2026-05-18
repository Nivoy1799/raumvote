"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Session = {
  id: string;
  treeId: string;
  title: string | null;
  status: string;
  durationDays: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  rootNodeId: string | null;
  systemPrompt: string;
  modelName: string;
  placeholderUrl: string;
  discoveryEnabled: boolean;
  imageModel: string;
  imagePrompt: string | null;
  referenceMedia: string[];
  _count: { nodes: number; votes: number; likes: number; comments: number };
};

export type Token = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  createdAt: string;
};

type AdminContextType = {
  authed: boolean;
  setAuthed: (a: boolean) => void;
  sessions: Session[];
  currentSession: Session | null;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  reloadSessions: () => Promise<void>;
  tokens: Token[];
  setTokens: (t: Token[]) => void;
  reloadTokens: () => Promise<void>;
  headers: () => Record<string, string>;
  error: string;
  setError: (e: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  saving: boolean;
  setSaving: (s: boolean) => void;
  now: number;
};

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const headers = useCallback(() => ({ "content-type": "application/json" }), []);

  // If a session is explicitly selected, use it; otherwise default to active/draft
  const currentSession = selectedSessionId
    ? (sessions.find((s) => s.id === selectedSessionId) ?? null)
    : (sessions.find((s) => s.status === "active" || s.status === "draft") ?? null);

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    const r = await fetch("/api/admin/auth/refresh", { method: "POST" });
    return r.ok;
  }, []);

  // Auto-login: check if admin cookie is valid, attempt refresh if expired
  useEffect(() => {
    fetch("/api/admin/session", { headers: headers() }).then(async (r) => {
      if (r.ok) {
        setAuthed(true);
        r.json().then((d) => setSessions(d.sessions ?? []));
      } else if (r.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          const r2 = await fetch("/api/admin/session", { headers: headers() });
          if (r2.ok) {
            setAuthed(true);
            r2.json().then((d) => setSessions(d.sessions ?? []));
          }
        }
      }
    });
  }, [headers, tryRefresh]);

  // Bootstrap a refresh cookie for pre-existing sessions, then keep the
  // access token alive by refreshing every 55 minutes.
  useEffect(() => {
    if (!authed) return;
    tryRefresh();
    const id = setInterval(() => tryRefresh(), 55 * 60 * 1000);
    return () => clearInterval(id);
  }, [authed, tryRefresh]);

  // Load sessions when authed
  const reloadSessions = useCallback(async () => {
    const res = await fetch("/api/admin/session", { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
    }
  }, [headers]);

  const reloadTokens = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tokens", { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens ?? []);
    }
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    if (authed) queueMicrotask(() => reloadSessions());
  }, [authed, reloadSessions]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        authed,
        setAuthed,
        sessions,
        currentSession,
        selectedSessionId,
        setSelectedSessionId,
        reloadSessions,
        tokens,
        setTokens,
        reloadTokens,
        headers,
        error,
        setError,
        loading,
        setLoading,
        saving,
        setSaving,
        now,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
