"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchOption } from "@/lib/tree.client";

export default function OptionPage() {
  const { optionId } = useParams<{ optionId: string }>();
  const [option, setOption] = useState<any>(null);

  useEffect(() => {
    fetchOption(optionId).then(setOption);
  }, [optionId]);

  if (!option) return <div>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>{option.title}</h1>
      <p>{option.description}</p>
      <img src={option.mediaUrl} style={{ width: "100%", borderRadius: 16 }} />
    </div>
  );
}
