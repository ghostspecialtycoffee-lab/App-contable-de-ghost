"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { NAV_SECTIONS, isNavActive } from "@/lib/navigation/app-navigation";

interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ open, onClose }: MobileMoreMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div className="ghost-more-sheet">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold">Menú</p>
          <button
            type="button"
            className="ghost-icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="ghost-sidebar-section-label">{section.label}</p>
              <ul className="mt-2 space-y-1">
                {section.items
                  .filter((item) => {
                    if (section.id !== "operacion") {
                      return true;
                    }
                    return !["/dashboard", "/ventas", "/pos/tables"].includes(item.href);
                  })
                  .map((item) => {
                    const active = isNavActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={[
                            "ghost-more-link",
                            active ? "ghost-more-link-active" : "",
                          ].join(" ")}
                        >
                          <span className="font-medium">{item.label}</span>
                          {item.description ? (
                            <span className="block text-xs text-[var(--ghost-text-muted)]">
                              {item.description}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
