import type { AuditMetadata, EntityId } from "@ghost/shared";

export const BRAND_ASSET_TYPES = [
  "logo",
  "icon",
  "banner",
  "watermark",
  "other",
] as const;

export type BrandAssetType = (typeof BRAND_ASSET_TYPES)[number];

export const BRAND_ASSET_TYPE_LABELS: Record<BrandAssetType, string> = {
  logo: "Logo",
  icon: "Ícono",
  banner: "Banner",
  watermark: "Marca de agua",
  other: "Otro",
};

export type BrandAssetStatus = "active" | "archived";

export interface BrandAsset extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  type: BrandAssetType;
  mimeType: string;
  dataUrl: string;
  status: BrandAssetStatus;
  isPrimary: boolean;
}

export const MAX_BRAND_ASSET_BYTES = 450_000;

export function validateBrandAssetName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return "El nombre debe tener al menos 2 caracteres.";
  }
  return null;
}
