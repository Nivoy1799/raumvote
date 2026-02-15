"use client";

import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faChartSimple,
  faWandSparkles,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useSession } from "@/lib/useSession";
import { SessionBanner } from "@/components/SessionBanner";
import { useResponsive } from "@/lib/useResponsive";

export default function GlobalTabbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const r = useResponsive();

  if (pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname === "/denied") return null;

  const tabbar: React.CSSProperties = {
    position: "fixed",
    left: r.spacing.medium,
    right: r.spacing.medium,
    bottom: r.spacing.medium,
    height: r.tabbarHeight,
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    borderRadius: Math.round(r.tabbarHeight * 0.28),
    padding: Math.round(r.tabbarHeight * 0.15),
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.08)",
    zIndex: 100,
  };

  return (
    <>
      <SessionBanner session={session} />
      <footer style={tabbar}>
        <Tab icon={faHouse} active={pathname.startsWith("/start")} onClick={() => router.push("/start")} iconSize={r.fontSize.button + 4} />
        <Tab icon={faChartSimple} active={pathname.startsWith("/results")} onClick={() => router.push("/results")} iconSize={r.fontSize.button + 4} />
        <Tab icon={faWandSparkles} active={pathname.startsWith("/dream")} onClick={() => router.push("/dream")} iconSize={r.fontSize.button + 4} />
        <Tab icon={faUser} active={pathname.startsWith("/me")} onClick={() => router.push("/me")} iconSize={r.fontSize.button + 4} />
      </footer>
    </>
  );
}

function Tab({ icon, active, onClick, iconSize }: any) {
  return (
    <button onClick={onClick} style={{ ...s.tab, ...(active ? s.active : null) }}>
      <FontAwesomeIcon icon={icon} style={{ fontSize: iconSize }} />
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  tab: {
    border: "none",
    background: "transparent",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    opacity: 0.6,
  },
  active: {
    opacity: 1,
    transform: "scale(1.1)",
  },
};
