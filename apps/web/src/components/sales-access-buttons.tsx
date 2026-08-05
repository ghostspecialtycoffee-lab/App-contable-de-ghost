"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@ghost/ui";

const SALES_LINKS = [
  { href: "/pos", label: "Mostrador" },
  { href: "/pos/tables", label: "Mesas" },
  { href: "/billing", label: "Registros" },
  { href: "/kds", label: "Comandas" },
] as const;

interface SalesAccessButtonsProps {
  compact?: boolean;
}

export function SalesAccessButtons({ compact = false }: SalesAccessButtonsProps) {
  const pathname = usePathname();

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {SALES_LINKS.map((link) => {
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
