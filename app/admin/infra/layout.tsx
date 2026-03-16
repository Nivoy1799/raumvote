"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { s } from "../styles";

const TABS = [
  { label: "Cloud Services", href: "/admin/infra/cloud" },
  { label: "App", href: "/admin/infra/app" },
  { label: "Loadbalancer", href: "/admin/infra/lb" },
  { label: "Worker", href: "/admin/infra/worker" },
  { label: "Logs", href: "/admin/infra/logs" },
  { label: "System", href: "/admin/infra/system" },
] as const;

export default function InfraLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                ...s.btnTiny,
                textDecoration: "none",
                background: active ? "rgba(96,165,250,0.3)" : undefined,
                borderColor: active ? "rgba(96,165,250,0.5)" : undefined,
                color: active ? "white" : "rgba(255,255,255,0.7)",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </>
  );
}
