"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useBrandAssets } from "@/hooks/use-brand-assets";
import { useAuth } from "@/providers/auth-provider";
import {
  formatFiscalAddress,
  formatOrganizationNit,
  isFiscalProfileComplete,
} from "@ghost/domain";

interface DocumentHeaderProps {
  title?: string;
  subtitle?: string;
  documentNumber?: string;
  documentDate?: string;
  extraLines?: string[];
}

export function DocumentHeader({
  title,
  subtitle,
  documentNumber,
  documentDate,
  extraLines = [],
}: DocumentHeaderProps) {
  const { organization } = useAuth();
  const { primaryLogo } = useBrandAssets();
  const fiscalProfile = organization?.fiscalProfile;
  const hasFiscalProfile = isFiscalProfileComplete(fiscalProfile);
  const displayName =
    fiscalProfile?.legalName ?? fiscalProfile?.tradeName ?? organization?.name ?? "Ghost Contable";

  return (
    <div className="border-b border-dashed border-gray-300 pb-3 text-center text-black">
      <div className="flex justify-center pb-3">
        <BrandLogo
          asset={primaryLogo}
          organizationName={displayName}
          size="md"
        />
      </div>

      <p className="text-base font-semibold">{displayName}</p>

      {hasFiscalProfile ? (
        <div className="mt-2 space-y-0.5 text-xs text-gray-700">
          {fiscalProfile.tradeName && fiscalProfile.tradeName !== fiscalProfile.legalName ? (
            <p>{fiscalProfile.tradeName}</p>
          ) : null}
          <p>NIT {formatOrganizationNit(fiscalProfile)}</p>
          <p>{formatFiscalAddress(fiscalProfile.address)}</p>
          {fiscalProfile.phone ? <p>Tel. {fiscalProfile.phone}</p> : null}
          {fiscalProfile.email ? <p>{fiscalProfile.email}</p> : null}
        </div>
      ) : (
        <p className="mt-1 text-xs text-gray-600">
          Configura datos fiscales en ajustes para facturas completas.
        </p>
      )}

      <p className="mt-3 text-sm font-medium text-gray-800">
        {title ?? (hasFiscalProfile ? "Factura de venta" : "Comprobante interno")}
      </p>
      {subtitle ? <p className="text-xs text-gray-600">{subtitle}</p> : null}

      {documentNumber ? (
        <p className="mt-2 font-mono text-xs">{documentNumber}</p>
      ) : null}
      {documentDate ? <p className="text-xs text-gray-600">{documentDate}</p> : null}

      {extraLines.map((line) => (
        <p key={line} className="mt-1 text-xs text-gray-700">
          {line}
        </p>
      ))}
    </div>
  );
}

interface DocumentFooterProps {
  className?: string;
}

export function DocumentFooter({ className = "" }: DocumentFooterProps) {
  const { organization } = useAuth();
  const fiscalProfile = organization?.fiscalProfile;

  if (!isFiscalProfileComplete(fiscalProfile)) {
    return (
      <p className={`text-center text-[11px] text-gray-500 ${className}`}>
        Precios con impuesto incluido. Documento de uso interno.
      </p>
    );
  }

  return (
    <div className={`space-y-2 border-t border-dashed border-gray-300 pt-3 text-center text-[11px] text-gray-600 ${className}`}>
      <p>
        Representante legal: {fiscalProfile.legalRepresentative.fullName} ·{" "}
        {fiscalProfile.legalRepresentative.documentType}{" "}
        {fiscalProfile.legalRepresentative.documentNumber}
      </p>
      {fiscalProfile.invoiceFooter ? <p>{fiscalProfile.invoiceFooter}</p> : null}
      <p>Precios con impuesto incluido.</p>
    </div>
  );
}
