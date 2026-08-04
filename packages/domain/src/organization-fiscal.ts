import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

export interface OrganizationLegalRepresentative {
  fullName: string;
  documentType: string;
  documentNumber: string;
}

export interface OrganizationFiscalAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface OrganizationFiscalProfile {
  legalName: string;
  tradeName?: string;
  nit: string;
  verificationDigit?: string;
  email?: string;
  phone?: string;
  address: OrganizationFiscalAddress;
  legalRepresentative: OrganizationLegalRepresentative;
  invoiceFooter?: string;
}

export function formatOrganizationNit(profile: Pick<OrganizationFiscalProfile, "nit" | "verificationDigit">): string {
  const digits = profile.nit.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return profile.verificationDigit
    ? `${formatted}-${profile.verificationDigit}`
    : formatted;
}

export function formatFiscalAddress(address: OrganizationFiscalAddress): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

export function isFiscalProfileComplete(
  profile?: OrganizationFiscalProfile | null,
): profile is OrganizationFiscalProfile {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.legalName.trim() &&
      profile.nit.trim() &&
      profile.address.line1.trim() &&
      profile.address.city.trim() &&
      profile.legalRepresentative.fullName.trim() &&
      profile.legalRepresentative.documentNumber.trim(),
  );
}

export function validateFiscalProfile(
  profile: OrganizationFiscalProfile,
): Result<OrganizationFiscalProfile> {
  if (profile.legalName.trim().length < 2) {
    return err("La razón social es obligatoria.");
  }

  if (profile.nit.replace(/\D/g, "").length < 5) {
    return err("El NIT es obligatorio.");
  }

  if (!profile.address.line1.trim() || !profile.address.city.trim()) {
    return err("La dirección fiscal es obligatoria.");
  }

  if (!profile.legalRepresentative.fullName.trim()) {
    return err("El nombre del representante legal es obligatorio.");
  }

  if (!profile.legalRepresentative.documentNumber.trim()) {
    return err("El documento del representante legal es obligatorio.");
  }

  return ok({
    ...profile,
    legalName: profile.legalName.trim(),
    tradeName: profile.tradeName?.trim() || undefined,
    nit: profile.nit.trim(),
    verificationDigit: profile.verificationDigit?.trim() || undefined,
    email: profile.email?.trim() || undefined,
    phone: profile.phone?.trim() || undefined,
    invoiceFooter: profile.invoiceFooter?.trim() || undefined,
    address: {
      line1: profile.address.line1.trim(),
      line2: profile.address.line2?.trim() || undefined,
      city: profile.address.city.trim(),
      state: profile.address.state?.trim() || undefined,
      country: profile.address.country.trim() || "CO",
      postalCode: profile.address.postalCode?.trim() || undefined,
    },
    legalRepresentative: {
      fullName: profile.legalRepresentative.fullName.trim(),
      documentType: profile.legalRepresentative.documentType.trim() || "CC",
      documentNumber: profile.legalRepresentative.documentNumber.trim(),
    },
  });
}
