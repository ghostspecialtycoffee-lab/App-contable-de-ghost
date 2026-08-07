export const PRODUCT_CATEGORIES = ["alimenticio", "menaje", "operativo"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  alimenticio: "Alimenticio",
  menaje: "Menaje",
  operativo: "Operativo",
};
