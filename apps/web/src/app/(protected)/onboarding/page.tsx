"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getCallableErrorMessage } from "@/lib/auth/errors";
import { createOrganization } from "@/lib/organizations/create-organization";
import { useAuth } from "@/providers/auth-provider";
import { slugifyOrganizationName } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshOrganization } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [branchName, setBranchName] = useState("Sucursal principal");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestedSlug = useMemo(() => slugifyOrganizationName(name), [name]);
  const effectiveSlug = slugTouched ? slug : suggestedSlug;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createOrganization({
        name: name.trim(),
        slug: effectiveSlug.trim(),
        branchName: branchName.trim(),
      });
      await refreshOrganization();
      router.replace("/dashboard");
    } catch (cause) {
      setError(getCallableErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card
        title="Configura tu negocio"
        description="Crea tu organización y sucursal principal. Este paso activa tu tenant en Ghost ERP."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre del negocio</span>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Identificador (slug)</span>
            <input
              type="text"
              required
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
            <span className="text-xs text-[var(--ghost-text-muted)]">
              Se usa internamente. Solo minúsculas, números y guiones.
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre de sucursal principal</span>
            <input
              type="text"
              required
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              className="w-full rounded-lg border border-[var(--ghost-border)] bg-[var(--ghost-surface-0)] px-3 py-2 text-sm outline-none ring-[var(--ghost-brand-500)] focus:ring-2"
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ghost-danger)]">{error}</p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading || !name.trim()}>
            {loading ? "Creando organización..." : "Continuar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
