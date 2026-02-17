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

function AdminShell({ children }: { children: React.ReactNode }) {
  const { secret, setSecret, authed, setAuthed, setTokens, error: ctxError, setError } = useAdmin();
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
