"use client";

import { useAdmin } from "../AdminContext";
import { NodeManager } from "../NodeManager";
import { s } from "../styles";

export default function NodesPage() {
  const { currentSession, headers } = useAdmin();

  if (!currentSession) {
    return <section style={s.card}><div style={s.muted}>Zuerst eine Session erstellen.</div></section>;
  }

  return (
    <NodeManager
      sessionId={currentSession.id}
      placeholderUrl={currentSession.placeholderUrl}
      headers={headers}
    />
  );
}
