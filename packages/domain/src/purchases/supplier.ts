import type { AuditMetadata, EntityId } from "@ghost/shared";

export interface Supplier extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  nit?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  paymentTermsDays?: number;
  notes?: string;
  isActive: boolean;
}

export interface SupplierInput {
  name: string;
  nit?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  paymentTermsDays?: number;
  notes?: string;
}
