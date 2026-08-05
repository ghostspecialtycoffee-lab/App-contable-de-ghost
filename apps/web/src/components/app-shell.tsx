"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DesktopSidebar } from "@/components/desktop-sidebar";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { firebaseUser, organization } = useAuth();
  const { primaryLogo } = useBrandAssets();
  const isGuestTableRoute = pathname.startsWith("/mesa");

  if (isGuestTableRoute) {
    return (
      <div className="min-h-screen bg-[var(--ghost-surface-0)]">
        <header className="border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] px-4 py-3 text-center">
          <p className="text-sm font-medium">Menú · mesa</p>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[var(--ghost-surface-0)]">
        <header className="sticky top-0 z-20 border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ghost-border)] text-sm font-bold">
                G
              </span>
              <span className="text-sm font-semibold">Ghost Contable</span>
            </Link>
            <nav className="flex items-center gap-1">
              {publicNavItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-[var(--ghost-text-muted)] hover:bg-[var(--ghost-surface-2)]"
                >
                  {item.label}
                </Link>
              ))}
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="ghost-shell-main-public">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ghost-surface-0)] md:flex">
      <DesktopSidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)]/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
              <BrandLogo
                asset={primaryLogo}
                organizationName={organization?.name}
                size="sm"
              />
              <span className="truncate text-sm font-semibold">
                {organization?.name ?? "Ghost"}
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="ghost-shell-main flex-1">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
