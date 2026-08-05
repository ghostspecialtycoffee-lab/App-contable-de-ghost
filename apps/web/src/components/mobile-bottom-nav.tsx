"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  NavIconHome,
  NavIconMore,
  NavIconSales,
  NavIconTables,
} from "@/components/nav-icons";
import { MobileMoreMenu } from "@/components/mobile-more-menu";
import { useAuth } from "@/providers/auth-provider";
import { MOBILE_PRIMARY_TABS, isNavActive } from "@/lib/navigation/app-navigation";

const hiddenPrefixes = ["/login", "/register", "/onboarding", "/mesa", "/menu"];

const TAB_ICONS = {
  "/dashboard": NavIconHome,
  "/ventas": NavIconSales,
  "/pos/tables": NavIconTables,
} as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { firebaseUser } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!firebaseUser) {
    return null;
  }

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const moreActive = MOBILE_PRIMARY_TABS.every(
    (tab) => !isNavActive(pathname, tab.href, [...tab.match]),
  );

  return (
    <>
      <nav
        className="ghost-bottom-nav md:hidden"
        aria-label="Navegación principal"
      >
        <ul className="ghost-bottom-nav-list">
          {MOBILE_PRIMARY_TABS.map((tab) => {
            const active = isNavActive(pathname, tab.href, [...tab.match]);
            const Icon = TAB_ICONS[tab.href as keyof typeof TAB_ICONS];
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
          <li>
            <button
              type="button"
              className={[
                "ghost-bottom-tab w-full",
                moreActive ? "ghost-bottom-tab-active" : "",
              ].join(" ")}
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
            >
              <NavIconMore />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>
      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
