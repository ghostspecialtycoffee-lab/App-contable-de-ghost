import type { AuditMetadata, CurrencyCode, EntityId } from "@ghost/shared";

import type { OrganizationCostMatrixSettings } from "./organization-cost-matrix.js";
import type { OrganizationCostingSettings } from "./organization-costing-settings.js";
import type { OrganizationEmailDeliveryConfig } from "./organization-email-delivery.js";
import type { OrganizationFiscalProfile } from "./organization-fiscal.js";

export type OrganizationStatus = "active" | "suspended" | "trial";

export interface OrganizationSettings {
  currency: CurrencyCode;
  timezone: string;
  locale: string;
  taxRate: number;
  fiscalCountry: string;
}

export interface Organization extends AuditMetadata {
  id: EntityId;
  name: string;
  slug: string;
  status: OrganizationStatus;
  settings: OrganizationSettings;
  fiscalProfile?: OrganizationFiscalProfile;
  costMatrixSettings?: OrganizationCostMatrixSettings;
  costingSettings?: OrganizationCostingSettings;
  emailDelivery?: OrganizationEmailDeliveryConfig;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  settings?: Partial<OrganizationSettings>;
  ownerUserId: EntityId;
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  currency: "COP",
  timezone: "America/Bogota",
  locale: "es-CO",
  taxRate: 0.19,
  fiscalCountry: "CO",
};
