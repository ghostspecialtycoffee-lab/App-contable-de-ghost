"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { GhostChatPanel } from "@/components/ghost-chat-panel";
import { GHOST_ASSISTANT_NAME } from "@/lib/assistant/ghost-chat-engine";
import { useAuth } from "@/providers/auth-provider";

function ChatFabIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8.5h10M7 12h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5 5.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H9.8L6 20.2V7.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const HIDDEN_PREFIXES = ["/login", "/register", "/mesa", "/menu"];

export function GhostChatFloating() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { firebaseUser, organization } = useAuth();

  const hiddenOnRoute =
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!firebaseUser || !organization || hiddenOnRoute) {
    return null;
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 md:bg-transparent"
          aria-label="Cerrar chat"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={[
          "fixed z-50 flex flex-col items-end",
          "right-4 md:right-6",
          "bottom-[calc(var(--ghost-bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:bottom-6",
        ].join(" ")}
      >
        {open ? (
          <div
            className="mb-3 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] shadow-2xl"
            role="dialog"
            aria-label={`Chat con ${GHOST_ASSISTANT_NAME}`}
          >
            <GhostChatPanel variant="floating" onClose={() => setOpen(false)} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)] shadow-lg transition hover:bg-[var(--ghost-brand-600)] active:scale-95"
          aria-label={open ? "Cerrar chat" : `Abrir chat con ${GHOST_ASSISTANT_NAME}`}
          aria-expanded={open}
        >
          <ChatFabIcon open={open} />
        </button>
      </div>
    </>
  );
}
