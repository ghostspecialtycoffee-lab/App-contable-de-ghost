import type { AuditMetadata, EntityId } from "@ghost/shared";

import type { CoTaxCategory } from "../fiscal/colombia-tax.js";

export const MENU_CATEGORIES = [
  "beverage",
  "food",
  "pastry",
  "other",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  beverage: "Bebidas",
  food: "Comida",
  pastry: "Repostería",
  other: "Otros",
};

export interface MenuCategoryMeta {
  emoji: string;
  tagline: string;
}

export const MENU_CATEGORY_META: Record<MenuCategory, MenuCategoryMeta> = {
  beverage: {
    emoji: "☕",
    tagline: "Cafés de especialidad, tés y bebidas frías",
  },
  food: {
    emoji: "🥗",
    tagline: "Platos salados y acompañamientos",
  },
  pastry: {
    emoji: "🍰",
    tagline: "Repostería artesanal y postres",
  },
  other: {
    emoji: "✨",
    tagline: "Otros favoritos de la casa",
  },
};

export const BEVERAGE_GROUPS = [
  "espresso",
  "filter",
  "cold",
  "tea",
  "other",
] as const;

export type BeverageGroup = (typeof BEVERAGE_GROUPS)[number];

export const BEVERAGE_GROUP_LABELS: Record<BeverageGroup, string> = {
  espresso: "Espresso",
  filter: "Filtrados",
  cold: "Frías",
  tea: "Tés e infusiones",
  other: "Otras bebidas",
};

export const BEVERAGE_GROUP_EMOJI: Record<BeverageGroup, string> = {
  espresso: "☕",
  filter: "💧",
  cold: "🧊",
  tea: "🍵",
  other: "🥤",
};

export const KITCHEN_STATIONS = ["counter", "bar", "kitchen"] as const;

export type KitchenStation = (typeof KITCHEN_STATIONS)[number];

export const KITCHEN_STATION_LABELS: Record<KitchenStation, string> = {
  counter: "Mostrador",
  bar: "Barra",
  kitchen: "Cocina",
};

export type MenuProductStatus = "active" | "inactive";

export const MENU_PRODUCT_STATUS_LABELS: Record<MenuProductStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

export interface MenuProduct extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  status: MenuProductStatus;
  sortOrder: number;
  description?: string;
  saleTaxCategory?: CoTaxCategory;
  recipeCost?: number;
  imageDataUrl?: string;
  imageMimeType?: string;
  beverageGroup?: BeverageGroup;
}

export interface CreateMenuProductInput {
  organizationId: EntityId;
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  description?: string;
  sortOrder?: number;
  actorUserId: EntityId;
}
