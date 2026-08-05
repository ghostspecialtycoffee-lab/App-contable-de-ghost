import type { PropsWithChildren, ReactNode } from "react";

interface PageSectionProps extends PropsWithChildren {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  action,
  className = "",
  children,
}: PageSectionProps) {
  return (
    <section className={["ghost-page-section", className].filter(Boolean).join(" ")}>
      {title || description || action ? (
        <header className="ghost-page-section-header">
          <div className="min-w-0">
            {title ? <h2 className="ghost-page-section-title">{title}</h2> : null}
            {description ? (
              <p className="ghost-page-section-desc">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
