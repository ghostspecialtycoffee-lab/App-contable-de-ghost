"use client";

import { useEffect, useRef, useState } from "react";

import { useGhostChat } from "@/hooks/use-ghost-chat";
import { GHOST_ASSISTANT_NAME } from "@/lib/assistant/ghost-chat-engine";
import { Button } from "@ghost/ui";

function renderGhostText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[var(--ghost-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={index} className="text-[var(--ghost-text-muted)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

interface GhostChatPanelProps {
  variant?: "page" | "floating";
  onClose?: () => void;
}

export function GhostChatPanel({ variant = "page", onClose }: GhostChatPanelProps) {
  const { messages, quickReplies, processing, sendMessage, resetChat } = useGhostChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, processing]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || processing) {
      return;
    }
    setDraft("");
    await sendMessage(value);
  }

  const panelClassName =
    variant === "floating"
      ? "flex h-[min(60vh,520px)] flex-col overflow-hidden bg-[var(--ghost-surface-1)]"
      : "flex h-[min(72vh,720px)] flex-col overflow-hidden rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]";

  return (
    <div className={panelClassName}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ghost-border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{GHOST_ASSISTANT_NAME}</p>
          <p className="text-xs text-[var(--ghost-text-muted)]">
            Conversación fluida · compras, ventas, mesas y costos
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={resetChat}>
            Reiniciar
          </Button>
          {onClose ? (
            <Button type="button" variant="secondary" size="sm" onClick={onClose} aria-label="Cerrar chat">
              ✕
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const isGhost = message.speaker === "ghost";
          return (
            <div
              key={message.id}
              className={`flex ${isGhost ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed sm:max-w-[80%] ${
                  isGhost
                    ? "rounded-bl-md bg-[var(--ghost-surface-2)] text-[var(--ghost-text)]"
                    : "rounded-br-md bg-[var(--ghost-brand-500)] text-white"
                }`}
              >
                {isGhost ? renderGhostText(message.text) : message.text}
              </div>
            </div>
          );
        })}
        {processing ? (
          <p className="text-xs text-[var(--ghost-text-muted)]">{GHOST_ASSISTANT_NAME} escribe…</p>
        ) : null}
      </div>

      {quickReplies.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-[var(--ghost-border)] px-4 py-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={processing}
              onClick={() => sendMessage(reply)}
              className="rounded-full border border-[var(--ghost-border)] px-3 py-1 text-xs hover:bg-[var(--ghost-surface-2)] disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-[var(--ghost-border)] px-4 py-3"
      >
        <label className="sr-only" htmlFor="ghost-chat-input">
          Mensaje para Ghost
        </label>
        <textarea
          id="ghost-chat-input"
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Cuéntame qué necesitas… (compras, ventas, mesas, costos)"
          className="ghost-input min-h-[44px] flex-1 resize-none"
          disabled={processing}
        />
        <Button type="submit" disabled={processing || !draft.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
