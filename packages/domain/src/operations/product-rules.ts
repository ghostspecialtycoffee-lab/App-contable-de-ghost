import type { ProductCategory } from "../inventory/product-categories.js";

export interface ProductCategoryRule {
  id: ProductCategory;
  label: string;
  tracksInventory: boolean;
  affectsFoodCost: boolean;
  typicalRoute: string;
  hint: string;
}

export const PRODUCT_CATEGORY_RULES: Record<ProductCategory, ProductCategoryRule> = {
  alimenticio: {
    id: "alimenticio",
    label: "Alimenticio",
    tracksInventory: true,
    affectsFoodCost: true,
    typicalRoute: "/inventory/items",
    hint: "Materia prima y productos para consumo o reventa. Entra al food cost.",
  },
  menaje: {
    id: "menaje",
    label: "Menaje",
    tracksInventory: true,
    affectsFoodCost: false,
    typicalRoute: "/inventory/items",
    hint: "Utensilios, vajilla, empaques y desechables. Operación, no comida.",
  },
  operativo: {
    id: "operativo",
    label: "Operativo",
    tracksInventory: false,
    affectsFoodCost: false,
    typicalRoute: "/purchases",
    hint: "Domicilio, parqueadero, etc. Solo registro en compra, sin bodega.",
  },
};

export function productCategoryTracksInventory(category: ProductCategory): boolean {
  return PRODUCT_CATEGORY_RULES[category].tracksInventory;
}

export function productCategoryAffectsFoodCost(category: ProductCategory): boolean {
  return PRODUCT_CATEGORY_RULES[category].affectsFoodCost;
}
