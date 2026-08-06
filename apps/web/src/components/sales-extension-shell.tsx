"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavIconHome,
  NavIconMore,
  NavIconSales,
  NavIconTables,
} from "@/components/nav-icons";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useActiveMembership, useAuth } from "@/providers/auth-provider";
import {
  getSalesMobileTabs,
  getSalesNavItems,
  isSalesNavActive,
  SALES_EXTENSION_PATHS,
} from "@/lib/navigation/sales-extension";

const TAB_ICONS: Record<string, typeof NavIconHome> = {
  [SALES_EXTENSION_PATHS.hub]: NavIconHome,
  [SALES_EXTENSION_PATHS.counter]: NavIconSales,
  [SALES_EXTENSION_PATHS.tables]: NavIconTables,
};

export function SalesExtensionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organization, profile, firebaseUser } = useAuth();
  const membership = useActiveMembership();
  const { primaryLogo } = useBrandAssets();
  const [moreOpen, setMoreOpen] = useState(false);

  const roles = membership?.roles ?? [];
  const navItems = getSalesNavItems(roles);
  const mobileTabs = getSalesMobileTabs(roles);
  const moreItems = navItems.filter(
    (item) => !mobileTabs.some((tab) => tab.href === item.href),
  );
  const moreActive = moreItems.some((item) => isSalesNavActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-[var(--ghost-surface-0)] md:flex">
      <aside className="ghost-sidebar hidden md:flex">
        <div className="ghost-sidebar-inner">
          <Link href={SALES_EXTENSION_PATHS.hub} className="ghost-sidebar-brand">
            <BrandLogo
              asset={primaryLogo}
              organizationName={organization?.name}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {organization?.name ?? "Ghost"}
              </p>
              <p className="truncate text-xs text-[var(--ghost-text-muted)]">
                Caja · ventas
              </p>
            </div>
          </Link>

          <nav className="ghost-sidebar-nav" aria-label="Menú de ventas">
            <div className="ghost-sidebar-section">
              <p className="ghost-sidebar-section-label">Ventas</p>
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const active = isSalesNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          "ghost-sidebar-link",
                          active ? "ghost-sidebar-link-active" : "",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="block">{item.label}</span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs font-normal text-[var(--ghost-text-muted)]">
                            {item.description}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className="ghost-sidebar-footer">
            <p className="truncate text-xs text-[var(--ghost-text-muted)]">
              {profile?.displayName ?? firebaseUser?.email}
            </p>
            <div className="mt-2 flex items-center gap-1">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex h-[var(--ghost-mobile-header)] items-center justify-between px-4">
            <Link href={SALES_EXTENSION_PATHS.hub} className="flex min-w-0 items-center gap-2">
              <BrandLogo
                asset={primaryLogo}
                organizationName={organization?.name}
                size="sm"
              />
              <span className="truncate text-sm font-semibold">
                {organization?.name ?? "Ghost"} · Caja
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="ghost-shell-main flex-1">{children}</main>

        <nav className="ghost-bottom-nav md:hidden" aria-label="Navegación de ventas">
          <ul className="ghost-bottom-nav-list">
            {mobileTabs.map((tab) => {
              const active = isSalesNavActive(pathname, tab.href, [...tab.match]);
              const Icon = TAB_ICONS[tab.href];
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={[
                      "ghost-bottom-tab",
                      active ? "ghost-bottom-tab-active" : "",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {Icon ? <Icon /> : null}
                    <span>{tab.label}</span>
                  </Link>
                </li>
              );
            })}
            {moreItems.length > 0 ? (
              <li>
                <button
                  type="button"
                  className={[
                    "ghost-bottom-tab w-full",
                    moreActive || moreOpen ? "ghost-bottom-tab-active" : "",
                  ].join(" ")}
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-expanded={moreOpen}
                >
                  <NavIconMore />
                  <span>Más</span>
                </button>
              </li>
            ) : null}
          </ul>
        </nav>

        {moreOpen && moreItems.length > 0 ? (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMoreOpen(false)}
            role="presentation"
          >
            <div
              className="absolute inset-x-0 bottom-[calc(var(--ghost-bottom-nav-height)+env(safe-area-inset-bottom))] rounded-t-2xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-4 shadow-lg"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-label="Más opciones de ventas"
            >
              <p className="mb-3 text-sm font-semibold">Más opciones</p>
              <ul className="space-y-1">
                {moreItems.map((item) => {
                  const active = isSalesNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          "block rounded-lg px-3 py-2.5 text-sm",
                          active
                            ? "bg-[var(--ghost-surface-2)] font-medium"
                            : "text-[var(--ghost-text-muted)]",
                        ].join(" ")}
                        onClick={() => setMoreOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
