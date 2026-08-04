"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@ghost/ui";

const SALES_LINKS = [
  {
    href: "/pos",
    label: "Mostrador",
    description: "Venta directa",
    primary: true,
  },
  {
    href: "/pos/tables",
    label: "Mesas",
    description: "Cuenta y QR",
    primary: true,
  },
  {
    href: "/billing",
    label: "Registros",
    description: "Comprobantes e informes",
    primary: false,
  },
  {
    href: "/kds",
    label: "Comandas",
    description: "Barra y cocina",
    primary: false,
  },
] as const;

interface SalesAccessButtonsProps {
  compact?: boolean;
  title?: string;
}

export function SalesAccessButtons({
  compact = false,
  title = "Acceso ventas",
}: SalesAccessButtonsProps) {
  const pathname = usePathname();

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {SALES_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href}>
              <Button
                size="sm"
                variant={active || link.primary ? "primary" : "secondary"}
              >
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ghost-text-muted)]">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SALES_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "group rounded-2xl border p-4 transition",
                active
                  ? "border-[var(--ghost-brand-500)] bg-[var(--ghost-surface-2)]"
                  : "border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] hover:border-[var(--ghost-brand-500)]",
              ].join(" ")}
            >
              <p
                className={[
                  "text-lg font-semibold",
                  link.primary ? "text-[var(--ghost-brand-500)]" : "",
                ].join(" ")}
              >
                {link.label}
              </p>
              <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">{link.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
