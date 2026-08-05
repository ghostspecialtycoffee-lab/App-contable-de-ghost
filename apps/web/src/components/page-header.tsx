import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Volver",
  action,
}: PageHeaderProps) {
  return (
    <header className="ghost-page-header">
      {backHref ? (
        <Link href={backHref} className="ghost-page-back">
          ← {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ghost-page-title">{title}</h1>
          {description ? <p className="ghost-page-description">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </header>
  );
}
