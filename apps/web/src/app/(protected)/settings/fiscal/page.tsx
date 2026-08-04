"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useBrandAssets } from "@/hooks/use-brand-assets";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { updateOrganizationFiscalProfile } from "@/lib/organizations/organization-fiscal";
import { useAuth } from "@/providers/auth-provider";
import type { OrganizationFiscalProfile } from "@ghost/domain";
import { Button, Card } from "@ghost/ui";

const emptyProfile = (): OrganizationFiscalProfile => ({
  legalName: "",
  tradeName: "",
  nit: "",
  verificationDigit: "",
  email: "",
  phone: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    country: "CO",
    postalCode: "",
  },
  legalRepresentative: {
    fullName: "",
    documentType: "CC",
    documentNumber: "",
  },
  invoiceFooter: "",
});

export default function FiscalSettingsPage() {
  const { organization, refreshOrganization } = useAuth();
  const { primaryLogo } = useBrandAssets();
  const [profile, setProfile] = useState<OrganizationFiscalProfile>(emptyProfile);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.fiscalProfile) {
      setProfile({
        ...emptyProfile(),
        ...organization.fiscalProfile,
        address: {
          ...emptyProfile().address,
          ...organization.fiscalProfile.address,
        },
        legalRepresentative: {
          ...emptyProfile().legalRepresentative,
          ...organization.fiscalProfile.legalRepresentative,
        },
      });
    }
  }, [organization?.fiscalProfile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization?.id) {
      return;
    }

    setSubmitError(null);
    setSaveMessage(null);
    setSubmitting(true);

    try {
      await updateOrganizationFiscalProfile({
        organizationId: organization.id,
        fiscalProfile: profile,
      });
      await refreshOrganization();
      setSaveMessage("Datos fiscales guardados. Las facturas usarán logo y representante legal.");
    } catch (cause) {
      setSubmitError(getCallableErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-[var(--ghost-text-muted)]">
          <Link href="/billing" className="underline">
            Registros
          </Link>{" "}
          ·{" "}
          <Link href="/brand" className="underline">
            Identidad visual
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Datos para facturas</h1>
        <p className="mt-1 text-sm text-[var(--ghost-text-muted)]">
          Logo de la empresa (en Identidad visual) y datos del representante legal para comprobantes
          y facturas de venta.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title="Información fiscal y representante legal">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">Razón social</span>
                <input
                  required
                  value={profile.legalName}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, legalName: event.target.value }))
                  }
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">Nombre comercial (opcional)</span>
                <input
                  value={profile.tradeName ?? ""}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, tradeName: event.target.value }))
                  }
                  className="ghost-input"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">NIT</span>
                <input
                  required
                  value={profile.nit}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, nit: event.target.value }))
                  }
                  className="ghost-input"
                  placeholder="900123456"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Dígito verificación</span>
                <input
                  value={profile.verificationDigit ?? ""}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      verificationDigit: event.target.value,
                    }))
                  }
                  className="ghost-input"
                  placeholder="7"
                  maxLength={1}
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-[var(--ghost-border)] pt-4">
              <p className="text-sm font-medium">Dirección fiscal</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Dirección</span>
                <input
                  required
                  value={profile.address.line1}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      address: { ...current.address, line1: event.target.value },
                    }))
                  }
                  className="ghost-input"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Ciudad</span>
                  <input
                    required
                    value={profile.address.city}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        address: { ...current.address, city: event.target.value },
                      }))
                    }
                    className="ghost-input"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Departamento</span>
                  <input
                    value={profile.address.state ?? ""}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        address: { ...current.address, state: event.target.value },
                      }))
                    }
                    className="ghost-input"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 border-t border-[var(--ghost-border)] pt-4">
              <p className="text-sm font-medium">Contacto en factura</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Teléfono</span>
                  <input
                    value={profile.phone ?? ""}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="ghost-input"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Correo</span>
                  <input
                    type="email"
                    value={profile.email ?? ""}
                    onChange={(event) =>
                      setProfile((current) => ({ ...current, email: event.target.value }))
                    }
                    className="ghost-input"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 border-t border-[var(--ghost-border)] pt-4">
              <p className="text-sm font-medium">Representante legal</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Nombre completo</span>
                <input
                  required
                  value={profile.legalRepresentative.fullName}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      legalRepresentative: {
                        ...current.legalRepresentative,
                        fullName: event.target.value,
                      },
                    }))
                  }
                  className="ghost-input"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Tipo documento</span>
                  <select
                    value={profile.legalRepresentative.documentType}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        legalRepresentative: {
                          ...current.legalRepresentative,
                          documentType: event.target.value,
                        },
                      }))
                    }
                    className="ghost-input"
                  >
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Número documento</span>
                  <input
                    required
                    value={profile.legalRepresentative.documentNumber}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        legalRepresentative: {
                          ...current.legalRepresentative,
                          documentNumber: event.target.value,
                        },
                      }))
                    }
                    className="ghost-input"
                  />
                </label>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Pie de factura (opcional)</span>
              <textarea
                value={profile.invoiceFooter ?? ""}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, invoiceFooter: event.target.value }))
                }
                className="ghost-input min-h-[72px]"
                placeholder="Gracias por su compra. Documento soporte de operación."
              />
            </label>

            {submitError ? (
              <p className="text-sm text-[var(--ghost-danger)]">{submitError}</p>
            ) : null}
            {saveMessage ? (
              <p className="text-sm text-[var(--ghost-brand-500)]">{saveMessage}</p>
            ) : null}

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar datos de facturación"}
            </Button>
          </form>
        </Card>

        <Card title="Vista previa de encabezado">
          {primaryLogo ? (
            <p className="mb-3 text-xs text-[var(--ghost-brand-500)]">Logo principal cargado</p>
          ) : (
            <p className="mb-3 text-xs text-[var(--ghost-text-muted)]">
              Sin logo.{" "}
              <Link href="/brand" className="underline">
                Subir logo
              </Link>
            </p>
          )}
          <div className="rounded-lg border border-[var(--ghost-border)] bg-white p-4 text-sm text-black">
            <p className="text-center text-base font-semibold">
              {profile.legalName || organization?.name || "Empresa"}
            </p>
            {profile.nit ? (
              <p className="mt-1 text-center text-xs text-gray-600">
                NIT {profile.nit}
                {profile.verificationDigit ? `-${profile.verificationDigit}` : ""}
              </p>
            ) : null}
            {profile.address.line1 ? (
              <p className="mt-1 text-center text-xs text-gray-600">
                {profile.address.line1}, {profile.address.city}
              </p>
            ) : null}
            {profile.legalRepresentative.fullName ? (
              <p className="mt-3 border-t border-dashed border-gray-300 pt-2 text-center text-[11px] text-gray-500">
                Rep. legal: {profile.legalRepresentative.fullName}
              </p>
            ) : null}
          </div>
          <Link href="/billing" className="mt-4 inline-block text-sm underline">
            Ver comprobantes
          </Link>
        </Card>
      </div>
    </div>
  );
}
