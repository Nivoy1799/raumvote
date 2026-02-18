"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminProvider, useAdmin } from "./AdminContext";
import { s } from "./styles";

const sections = [
  { key: "session", path: "/admin/session", label: "Session" },
  { key: "images", path: "/admin/images", label: "Bilder" },
  { key: "nodes", path: "/admin/nodes", label: "Baum" },
  { key: "tokens", path: "/admin/tokens", label: "Tokens" },
];

const statusColors: Record<string, string> = { draft: "rgba(255,255,255,0.6)", active: "rgba(96,165,250,1)", archived: "rgba(74,222,128,1)" };

function AdminShell({ children }: { children: React.ReactNode }) {
  const { secret, setSecret, authed, setAuthed, setTokens, sessions, currentSession, selectedSessionId, setSelectedSessionId, error: ctxError, setError } = useAdmin();
  const [loginError, setLoginError] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  async function login() {
    setLoginError("");
    const res = await fetch("/api/admin/tokens", { headers: { authorization: `Bearer ${secret}` } });
    if (res.ok) {
      sessionStorage.setItem("adminSecret", secret);
      setAuthed(true);
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } else {
      setLoginError("Falsches Passwort");
    }
  }

  if (!authed) {
    return (
      <main style={s.shell}>
        <div style={s.center}>
          <div style={s.h1}>Admin</div>
          <div style={s.sub}>Bitte Admin-Passwort eingeben</div>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="ADMIN_SECRET"
            style={s.input}
            autoFocus
          />
          <button style={s.btn} onClick={login}>Login</button>
          {loginError && <div style={s.error}>{loginError}</div>}
        </div>
      </main>
    );
  }

  // Determine active section from pathname
  const activeKey = sections.find((sec) => pathname.startsWith(sec.path))?.key || "session";
  const isWide = activeKey === "nodes";

  return (
    <main style={s.shell}>
      <nav style={s.tabBar}>
        {sections.map((sec) => (
          <button
            key={sec.key}
            onClick={() => router.push(sec.path)}
            style={{
              ...s.tabBtn,
              ...(activeKey === sec.key ? s.tabBtnActive : {}),
            }}
          >
            {sec.label}
          </button>
        ))}
        {sessions.length > 1 && (
          <select
            value={selectedSessionId ?? ""}
            onChange={(e) => setSelectedSessionId(e.target.value || null)}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              outline: "none",
              maxWidth: 180,
            }}
          >
            <option value="">Aktive Session</option>
            {sessions.map((sess) => (
              <option key={sess.id} value={sess.id} style={{ color: statusColors[sess.status] }}>
                {sess.title || sess.treeId} ({sess.status === "active" ? "Aktiv" : sess.status === "draft" ? "Entwurf" : "Archiv"})
              </option>
            ))}
          </select>
        )}
      </nav>

      <div style={{ ...s.container, ...(isWide ? { width: "min(1100px, 100vw)" } : {}) }}>
        {ctxError && (
          <div style={{ ...s.error, marginBottom: 12 }}>
            {ctxError}
            <button onClick={() => setError("")} style={{ ...s.btnTiny, marginLeft: 8 }}>X</button>
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
