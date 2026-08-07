"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSalesPaths } from "@/hooks/use-sales-paths";
import { Button } from "@ghost/ui";

interface SalesAccessButtonsProps {
  compact?: boolean;
}

export function SalesAccessButtons({ compact = false }: SalesAccessButtonsProps) {
  const pathname = usePathname();
  const { paths } = useSalesPaths();

  const salesLinks = [
    { href: paths.counter, label: "Mostrador" },
    { href: paths.tables, label: "Mesas" },
    { href: paths.records, label: "Registros" },
    { href: paths.kds, label: "Comandas" },
  ] as const;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {salesLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href}>
              <Button size="sm" variant={active ? "primary" : "secondary"}>
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>
    );
  }

  return null;
}
