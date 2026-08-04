"use client";

import { useEffect, type PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

export function AuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { firebaseUser, profile, loading, isConfigured } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isConfigured) {
      return;
    }

    if (!firebaseUser) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const hasMembership = Boolean(
      profile?.memberships.some((membership) => membership.isActive),
    );

    if (!hasMembership && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    if (hasMembership && pathname === "/onboarding") {
      router.replace("/dashboard");
    }
  }, [firebaseUser, profile, loading, isConfigured, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[var(--ghost-text-muted)]">Cargando sesión...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-[var(--ghost-border)] bg-[var(--ghost-surface-1)] p-6">
        <h2 className="text-lg font-semibold">Firebase no configurado</h2>
        <p className="mt-2 text-sm text-[var(--ghost-text-muted)]">
          Copia `.env.example` a `apps/web/.env.local` y completa las variables
          `NEXT_PUBLIC_FIREBASE_*` para habilitar autenticación.
        </p>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  return children;
}
