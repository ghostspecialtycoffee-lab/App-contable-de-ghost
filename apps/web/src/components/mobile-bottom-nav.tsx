"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

const tabs = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/inventory", label: "Inventario" },
  { href: "/inventory/items", label: "Ítems" },
  { href: "/inventory/movements", label: "Movim." },
];

const hiddenPrefixes = ["/login", "/register", "/onboarding"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { firebaseUser } = useAuth();

  if (!firebaseUser) {
    return null;
  }

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : tab.href === "/inventory"
                ? pathname === "/inventory" ||
                  pathname.startsWith("/inventory/warehouses")
                : pathname.startsWith(tab.href);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={[
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
                  active
                    ? "text-[var(--ghost-brand-500)]"
                    : "text-[var(--ghost-text-muted)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1 w-8 rounded-full",
                    active ? "bg-[var(--ghost-brand-500)]" : "bg-transparent",
                  ].join(" ")}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
