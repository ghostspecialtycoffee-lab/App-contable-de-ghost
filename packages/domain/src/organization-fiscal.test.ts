import { describe, expect, it } from "vitest";

import {
  formatOrganizationNit,
  isFiscalProfileComplete,
  validateFiscalProfile,
} from "./organization-fiscal.js";

describe("validateFiscalProfile", () => {
  it("valida perfil fiscal mínimo", () => {
    const result = validateFiscalProfile({
      legalName: "Ghost Specialty Coffee SAS",
      nit: "900123456",
      verificationDigit: "7",
      address: {
        line1: "Calle 10 #20-30",
        city: "Bogotá",
        country: "CO",
      },
      legalRepresentative: {
        fullName: "Juan Pérez",
        documentType: "CC",
        documentNumber: "1234567890",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.address.line2).toBe("");
      expect(result.value.tradeName).toBe("");
    }
    expect(isFiscalProfileComplete(result.ok ? result.value : null)).toBe(true);
  });
});

describe("formatOrganizationNit", () => {
  it("formatea NIT con dígito de verificación", () => {
    expect(
      formatOrganizationNit({ nit: "900123456", verificationDigit: "7" }),
    ).toBe("900.123.456-7");
  });
});
