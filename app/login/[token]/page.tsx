"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }

    (async () => {
      const res = await fetch(`/api/auth/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => null);

      if (data?.valid) {
        localStorage.setItem("voterId", token);
        router.replace("/start");
      } else {
        setStatus("error");
      }
    })();
  }, [token, router]);

  if (status === "error") {
    return (
      <main style={s.shell}>
        <div style={s.center}>
          <div style={s.icon}>&#x26D4;</div>
          <div style={s.title}>Ungultiger Zugang</div>
          <div style={s.sub}>Dieser Code ist ungultig oder wurde gesperrt.</div>
        </div>
      </main>
    );
  }

  return (
    <main style={s.shell}>
      <div style={s.center}>
        <div style={s.title}>Anmeldung...</div>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { position: "fixed", inset: 0, background: "black", color: "white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 },
  center: { textAlign: "center", padding: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 950, letterSpacing: -0.3 },
  sub: { fontSize: 14, opacity: 0.7, marginTop: 10, lineHeight: 1.4 },
};
