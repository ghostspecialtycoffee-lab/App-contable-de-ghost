import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Volver",
}: PageHeaderProps) {
  return (
    <header className="ghost-page-header">
      {backHref ? (
        <Link href={backHref} className="ghost-page-back">
          ← {backLabel}
        </Link>
      ) : null}
      <h1 className="ghost-page-title">{title}</h1>
      {description ? <p className="ghost-page-description">{description}</p> : null}
    </header>
  );
}
