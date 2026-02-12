"use client";

import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faChartSimple,
  faWandSparkles,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export default function GlobalTabbar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <footer style={s.tabbar}>
      <Tab icon={faHouse} active={pathname.startsWith("/start")} onClick={() => router.push("/start")} />
      <Tab icon={faChartSimple} active={pathname.startsWith("/results")} onClick={() => router.push("/results")} />
      <Tab icon={faWandSparkles} active={pathname.startsWith("/dream")} onClick={() => router.push("/dream")} />
      <Tab icon={faUser} active={pathname.startsWith("/me")} onClick={() => router.push("/me")} />
    </footer>
  );
}

function Tab({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} style={{ ...s.tab, ...(active ? s.active : null) }}>
      <FontAwesomeIcon icon={icon} style={{ fontSize: 18 }} />
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  tabbar: {
    position: "fixed",
    left: 12,
    right: 12,
    bottom: 12,
    height: 64,
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    borderRadius: 18,
    padding: 10,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.08)",
    zIndex: 100,
  },
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
