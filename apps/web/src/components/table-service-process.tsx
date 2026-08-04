"use client";

export const TABLE_SERVICE_STEPS = [
  { id: "mesa", label: "Mesa" },
  { id: "cuenta", label: "Cuenta" },
  { id: "pedido", label: "Pedido" },
  { id: "comanda", label: "Comanda" },
  { id: "cobro", label: "Cobro" },
  { id: "registro", label: "Registros" },
] as const;

export type TableServiceStepId = (typeof TABLE_SERVICE_STEPS)[number]["id"];

interface TableServiceProcessLineProps {
  currentStep: TableServiceStepId;
  compact?: boolean;
}

export function TableServiceProcessLine({
  currentStep,
  compact = false,
}: TableServiceProcessLineProps) {
  const currentIndex = TABLE_SERVICE_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol
      className={[
        "flex flex-wrap items-center gap-1 text-xs",
        compact ? "gap-0.5" : "gap-1",
      ].join(" ")}
      aria-label="Línea de proceso de mesa"
    >
      {TABLE_SERVICE_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step.id} className="flex items-center gap-1">
            {index > 0 ? (
              <span
                className={[
                  "hidden sm:inline",
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
