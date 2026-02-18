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
  secret: string;
  setSecret: (s: string) => void;
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
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const headers = useCallback(
    () => ({ "content-type": "application/json", authorization: `Bearer ${secret}` }),
    [secret],
  );

  // If a session is explicitly selected, use it; otherwise default to active/draft
  const currentSession = selectedSessionId
    ? sessions.find((s) => s.id === selectedSessionId) ?? null
    : sessions.find((s) => s.status === "active" || s.status === "draft") ?? null;

  // Auto-login from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("adminSecret");
    if (saved) {
      setSecret(saved);
      fetch("/api/admin/tokens", { headers: { authorization: `Bearer ${saved}` } })
        .then((r) => { if (r.ok) { setAuthed(true); return r.json(); } return null; })
        .then((d) => { if (d) setTokens(d.tokens ?? []); });
    }
  }, []);

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
    if (authed) reloadSessions();
  }, [authed, reloadSessions]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminContext.Provider value={{
      secret, setSecret, authed, setAuthed,
      sessions, currentSession, selectedSessionId, setSelectedSessionId, reloadSessions,
      tokens, setTokens, reloadTokens,
      headers, error, setError, loading, setLoading, saving, setSaving, now,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
