"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const [voterId, setVoterId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("voterId");
    if (!id) {
      router.replace("/denied");
      return;
    }

    fetch(`/api/auth/validate?token=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid) {
          setVoterId(id);
        } else {
          localStorage.removeItem("voterId");
          router.replace("/denied");
        }
      })
      .catch(() => {
        // Network error — allow offline usage with existing token
        setVoterId(id);
      })
      .finally(() => setChecking(false));
  }, [router]);

  return { voterId, checking };
}
