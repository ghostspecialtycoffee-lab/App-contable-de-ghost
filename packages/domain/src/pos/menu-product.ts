import type { AuditMetadata, EntityId } from "@ghost/shared";

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

export const KITCHEN_STATIONS = ["counter", "bar", "kitchen"] as const;

export type KitchenStation = (typeof KITCHEN_STATIONS)[number];

export const KITCHEN_STATION_LABELS: Record<KitchenStation, string> = {
  counter: "Mostrador",
  bar: "Barra",
  kitchen: "Cocina",
};

export type MenuProductStatus = "active" | "inactive";

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
