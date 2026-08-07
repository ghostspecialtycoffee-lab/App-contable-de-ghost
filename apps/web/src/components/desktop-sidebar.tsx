"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useAuth } from "@/providers/auth-provider";
import { NAV_SECTIONS, isNavActive } from "@/lib/navigation/app-navigation";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { organization, profile, firebaseUser } = useAuth();
  const { primaryLogo } = useBrandAssets();

  return (
    <aside className="ghost-sidebar hidden md:flex">
      <div className="ghost-sidebar-inner">
        <Link href="/dashboard" className="ghost-sidebar-brand">
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
              Contable
            </p>
          </div>
        </Link>

        <nav className="ghost-sidebar-nav" aria-label="Menú principal">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="ghost-sidebar-section">
              <p className="ghost-sidebar-section-label">{section.label}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
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
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
  );
}
