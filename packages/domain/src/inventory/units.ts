export const INVENTORY_ITEM_TYPES = [
  "raw_material",
  "finished_product",
  "supply",
  "packaging",
] as const;

export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

export const BASE_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "unit",
  "box",
  "bag",
] as const;

export type BaseUnit = (typeof BASE_UNITS)[number];

export const INVENTORY_ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  raw_material: "Materia prima",
  finished_product: "Producto terminado",
  supply: "Insumo",
  packaging: "Empaque",
};

export const BASE_UNIT_LABELS: Record<BaseUnit, string> = {
  g: "Gramos",
  kg: "Kilogramos",
  ml: "Mililitros",
  l: "Litros",
  unit: "Unidad",
  box: "Caja",
  bag: "Bolsa",
};
