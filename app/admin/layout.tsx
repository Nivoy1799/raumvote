"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSliders,
  faImage,
  faNetworkWired,
  faKey,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { AdminProvider, useAdmin } from "./AdminContext";
import { s, SIDEBAR_W, HEADER_H } from "./styles";

import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

const sections: { key: string; path: string; label: string; icon: IconDefinition }[] = [
  { key: "session", path: "/admin/session", label: "Session", icon: faSliders },
  { key: "images", path: "/admin/images", label: "Bilder", icon: faImage },
  { key: "nodes", path: "/admin/nodes", label: "Baum", icon: faNetworkWired },
  { key: "tokens", path: "/admin/tokens", label: "Tokens", icon: faKey },
];

const statusColors: Record<string, string> = {
  draft: "rgba(255,255,255,0.6)",
  active: "rgba(96,165,250,1)",
  archived: "rgba(74,222,128,1)",
};

function AdminShell({ children }: { children: React.ReactNode }) {
  const {
    secret, setSecret, authed, setAuthed, setTokens,
    sessions, currentSession, selectedSessionId, setSelectedSessionId,
    error: ctxError, setError,
  } = useAdmin();
  const [loginError, setLoginError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const activeKey = sections.find((sec) => pathname.startsWith(sec.path))?.key || "session";
  const activeLabel = sections.find((sec) => sec.key === activeKey)?.label || "Admin";
  const isWide = activeKey === "nodes";

  function navigate(path: string) {
    router.push(path);
    setMobileMenuOpen(false);
  }

  // ── Shared nav content (used in both sidebar and mobile menu) ──
  const navContent = (
    <>
      <div style={s.sidebarLogo}>
        <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.5 }}>RaumVote</div>
        <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 700, marginTop: 2, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Admin</div>
      </div>

      <nav style={s.sidebarNav}>
        {sections.map((sec) => (
          <button
            key={sec.key}
            onClick={() => navigate(sec.path)}
            style={{
              ...s.sidebarNavItem,
              ...(activeKey === sec.key ? s.sidebarNavItemActive : {}),
            }}
          >
            <FontAwesomeIcon icon={sec.icon} style={{ width: 16, fontSize: 14 }} />
            {sec.label}
          </button>
        ))}
      </nav>

      <div style={s.sidebarFooter}>
        <div style={{ fontSize: 10, opacity: 0.35, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1 }}>Session</div>
        {currentSession && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColors[currentSession.status] || "rgba(255,255,255,0.4)",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {currentSession.title || currentSession.treeId}
            </span>
          </div>
        )}
        <select
          value={selectedSessionId ?? ""}
          onChange={(e) => setSelectedSessionId(e.target.value || null)}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">Aktive Session</option>
          {sessions.map((sess) => (
            <option key={sess.id} value={sess.id}>
              {sess.title || sess.treeId} ({sess.status === "active" ? "Aktiv" : sess.status === "draft" ? "Entwurf" : "Archiv"})
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "black", color: "white" }}>
      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside style={s.sidebar}>
          {navContent}
        </aside>
      )}

      {/* ── Mobile menu overlay ── */}
      {isMobile && mobileMenuOpen && (
        <>
          <div style={s.mobileMenuBackdrop} onClick={() => setMobileMenuOpen(false)} />
          <aside style={s.mobileMenuOverlay}>
            {navContent}
          </aside>
        </>
      )}

      {/* ── Header ── */}
      <header style={{
        ...s.header,
        left: isMobile ? 0 : SIDEBAR_W,
      }}>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 4 }}
          >
            <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} style={{ fontSize: 18 }} />
          </button>
        )}
        <span style={s.headerTitle}>{activeLabel}</span>

        {ctxError && (
          <div style={{ ...s.error, marginLeft: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {ctxError}
            <button onClick={() => setError("")} style={{ ...s.btnTiny, marginLeft: 8 }}>X</button>
          </div>
        )}
      </header>

      {/* ── Content area ── */}
      <div style={{
        ...s.contentArea,
        paddingLeft: isMobile ? 0 : SIDEBAR_W,
        paddingTop: HEADER_H,
      }}>
        <div style={{ ...s.container, ...(isWide ? { maxWidth: 1200 } : {}) }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
