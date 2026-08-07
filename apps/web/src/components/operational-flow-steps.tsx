import Link from "next/link";

import type { OperationalStep } from "@ghost/domain";

interface OperationalFlowStepsProps {
  title: string;
  steps: OperationalStep[];
  compact?: boolean;
  completedOrders?: number[];
}

export function OperationalFlowSteps({
  title,
  steps,
  compact = false,
  completedOrders = [],
}: OperationalFlowStepsProps) {
  const completed = new Set(completedOrders);

  return (
    <section className={compact ? "ghost-flow-compact" : "ghost-flow"} aria-label={title}>
      {!compact ? <p className="ghost-flow-title">{title}</p> : null}
      <ol className="ghost-flow-list">
        {steps.map((step) => (
          <li
            key={step.order}
            className={[
              "ghost-flow-step",
              completed.has(step.order) ? "ghost-flow-step-done" : "",
            ].join(" ")}
          >
            <span className="ghost-flow-order">
              {completed.has(step.order) ? "✓" : step.order}
            </span>
            <div className="min-w-0 flex-1">
              {step.href ? (
                <Link href={step.href} className="ghost-flow-label">
                  {step.label}
                </Link>
              ) : (
                <span className="ghost-flow-label">{step.label}</span>
              )}
              {!compact ? (
                <p className="ghost-flow-desc">{step.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
