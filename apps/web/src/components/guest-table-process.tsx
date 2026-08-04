"use client";

const GUEST_STEPS = [
  { id: "menu", label: "Menú" },
  { id: "pedido", label: "Pedido" },
  { id: "cuenta", label: "Cuenta" },
] as const;

export type GuestTableStepId = (typeof GUEST_STEPS)[number]["id"];

interface GuestTableProcessLineProps {
  currentStep: GuestTableStepId;
}

export function GuestTableProcessLine({ currentStep }: GuestTableProcessLineProps) {
  const currentIndex = GUEST_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol
      className="flex items-center justify-center gap-1 text-xs"
      aria-label="Tu proceso en la mesa"
    >
      {GUEST_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step.id} className="flex items-center gap-1">
            {index > 0 ? (
              <span
                className={[
                  isComplete ? "text-[var(--ghost-brand-500)]" : "text-[var(--ghost-text-muted)]",
                ].join(" ")}
                aria-hidden
              >
                →
              </span>
            ) : null}
            <span
              className={[
                "rounded-full px-2 py-0.5 font-medium",
                isCurrent
                  ? "bg-[var(--ghost-brand-500)] text-[var(--ghost-brand-fg)]"
                  : isComplete
                    ? "bg-[var(--ghost-surface-2)] text-[var(--ghost-brand-500)]"
                    : "bg-[var(--ghost-surface-2)] text-[var(--ghost-text-muted)]",
              ].join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
