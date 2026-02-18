import { Suspense } from "react";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResultsPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 16, color: "white", background: "black", minHeight: "100dvh" }}>Loading…</div>}
    >
      <ResultsClient />
    </Suspense>
  );
}
