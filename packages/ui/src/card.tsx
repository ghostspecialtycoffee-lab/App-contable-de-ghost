import type { PropsWithChildren } from "react";

export interface CardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  className?: string;
}

export function Card({
  title,
  description,
  className = "",
  children,
}: CardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-4 sm:p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || description) && (
        <header className="mb-4">
          {title ? (
            <h2 className="text-base font-semibold text-[var(--ghost-text)]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
              {description}
            </p>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
