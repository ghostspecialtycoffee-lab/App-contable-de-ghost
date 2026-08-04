"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useAuth } from "@/providers/auth-provider";

const publicNavItems = [
  { href: "/", label: "Inicio" },
  { href: "/login", label: "Acceso" },
  { href: "/register", label: "Registro" },
];

const appNavItems = [
  { href: "/dashboard", label: "Panel" },
  { href: "/pos", label: "Mostrador" },
  { href: "/kds", label: "Comandas" },
  { href: "/billing", label: "Registros" },
  { href: "/inventory", label: "Inventario" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { firebaseUser, profile, organization } = useAuth();
  const { primaryLogo } = useBrandAssets();

  const navItems = firebaseUser ? appNavItems : publicNavItems;

  return (
    <div className="min-h-screen bg-[var(--ghost-surface-0)]">
      <header className="sticky top-0 z-20 border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href={firebaseUser ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-2">
            {firebaseUser ? (
              <BrandLogo
                asset={primaryLogo}
                organizationName={organization?.name}
                size="sm"
              />
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-2)] text-sm font-bold">
                G
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Ghost Contable</p>
              <p className="truncate text-xs text-[var(--ghost-text-muted)]">
                {organization?.name ?? "Operación interna"}
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--ghost-surface-2)] font-medium text-[var(--ghost-text)]"
                      : "text-[var(--ghost-text-muted)] hover:bg-[var(--ghost-surface-2)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            {firebaseUser ? (
              <span className="hidden max-w-[120px] truncate text-xs text-[var(--ghost-text-muted)] lg:inline">
                {profile?.displayName ?? firebaseUser.email}
              </span>
            ) : null}
            {firebaseUser ? <SignOutButton /> : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="ghost-shell-main">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
