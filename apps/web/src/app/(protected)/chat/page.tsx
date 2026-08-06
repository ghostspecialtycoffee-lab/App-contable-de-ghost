"use client";

import { GhostChatPanel } from "@/components/ghost-chat-panel";
import { PageHeader } from "@/components/page-header";

export default function GhostChatPage() {
  return (
    <div className="ghost-page-stack">
      <PageHeader
        title="Ghost"
        description="Conversación libre: sin menús ni botones de opciones. Escribe y Ghost responde con contexto de tu operación."
      />

      <GhostChatPanel />
    </div>
  );
}
