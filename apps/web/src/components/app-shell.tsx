"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/login", label: "Acceso" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--ghost-surface-0)]">
      <header className="sticky top-0 z-20 border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ghost-brand-500)] text-sm font-bold text-white">
                G
              </span>
              <div>
                <p className="text-sm font-semibold">Ghost ERP</p>
                <p className="text-xs text-[var(--ghost-text-muted)]">
                  Specialty Coffee Lab
                </p>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--ghost-surface-2)] font-medium text-[var(--ghost-text)]"
                        : "text-[var(--ghost-text-muted)] hover:bg-[var(--ghost-surface-2)] hover:text-[var(--ghost-text)]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
