import type React from "react";

const SIDEBAR_W = 240;
const HEADER_H = 56;

export { SIDEBAR_W, HEADER_H };

export const s: Record<string, React.CSSProperties> = {
  // ── Login ──
  shell: { position: "fixed", inset: 0, background: "black", color: "white", overflow: "auto", zIndex: 1 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 12, padding: 24 },

  // ── Sidebar (desktop) ──
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_W,
    background: "rgb(10,10,10)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    zIndex: 60,
  },
  sidebarLogo: {
    padding: "24px 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sidebarNav: {
    flex: 1,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  sidebarNavItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "white",
    opacity: 0.5,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s, background 0.15s",
    textAlign: "left" as const,
    width: "100%",
    borderLeft: "3px solid transparent",
  },
  sidebarNavItemActive: {
    opacity: 1,
    background: "rgba(255,255,255,0.08)",
    borderLeftColor: "rgba(96,165,250,1)",
  },
  sidebarFooter: {
    padding: "16px 14px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },

  // ── Header ──
  header: {
    position: "fixed",
    top: 0,
    right: 0,
    height: HEADER_H,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 24px",
    background: "rgba(10,10,10,0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    zIndex: 55,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: -0.2,
  },

  // ── Content area ──
  contentArea: {
    minHeight: "100dvh",
    background: "black",
    overflow: "auto",
  },
  container: {
    maxWidth: 900,
    width: "100%",
    margin: "0 auto",
    padding: "24px 20px",
  },

  // ── Mobile menu overlay ──
  mobileMenuBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 59,
  },
  mobileMenuOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_W,
    background: "rgb(10,10,10)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    zIndex: 60,
    transition: "transform 0.2s ease",
  },

  // ── Typography ──
  h1: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 12, opacity: 0.7, marginTop: 4, marginBottom: 14 },

  // ── Cards ──
  card: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 900, marginBottom: 10 },
  muted: { opacity: 0.5, fontSize: 13 },

  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },

  // ── Inputs ──
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
    fontSize: 14,
  },

  // ── Buttons ──
  btn: {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
  },
  btnSmall: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  btnTiny: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "5px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 11,
  },
  error: { color: "#ff3b5c", fontSize: 13, fontWeight: 800 },

  // ── Session ──
  statusBadge: { fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 },
  sessionMeta: { fontSize: 12, opacity: 0.6 },
  countdown: { marginTop: 8, fontSize: 18, fontWeight: 950, letterSpacing: -0.3 },
  deadlineText: { display: "block", fontSize: 11, opacity: 0.5, fontWeight: 600, marginTop: 2 },
  sessionPast: { display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)" },

  // ── Tokens ──
  tokenRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.2)",
  },
  tokenLabel: { fontWeight: 900, fontSize: 14 },
  tokenCode: { fontSize: 11, opacity: 0.6, fontFamily: "monospace", marginTop: 2 },
  tokenMeta: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  tokenActions: { display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap" },
};
