"use client";

import { useSearchParams } from "next/navigation";

import { usePublicDigitalMenu } from "@/hooks/use-digital-menu-settings";

export function GuestMenuHeader() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("o");
  const { config } = usePublicDigitalMenu(organizationId);
  const hasOrganizationTarget = Boolean(organizationId || searchParams.get("s"));

  if (!hasOrganizationTarget) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--ghost-border)]/80 bg-[var(--ghost-surface-0)]/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
        {config?.logoDataUrl ? (
          <img
            src={config.logoDataUrl}
            alt=""
            className="h-8 w-8 rounded-lg object-cover"
            aria-hidden="true"
          />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ghost-brand-500)] text-sm font-bold text-[var(--ghost-brand-fg)]">
            {(config?.organizationName ?? "M").slice(0, 1)}
          </span>
        )}
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ghost-accent-500)]">
            Menú digital
          </p>
          <p className="text-sm font-semibold leading-tight">
            {config?.organizationName ?? "Nuestro menú"}
          </p>
        </div>
      </div>
    </header>
  );
}
