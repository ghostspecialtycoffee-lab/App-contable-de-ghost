import sodasData from "@/data/colombia-sodas-catalog.json";

import { normalizeCatalogName } from "@/lib/costing/ghost-menu-catalog";

export type ColombiaSodaSpec = {
  name: string;
  description: string;
  price: number;
  brand: string;
};

export const COLOMBIA_SODAS_CATALOG: ColombiaSodaSpec[] = sodasData.brandGroups.flatMap(
  (group) =>
    group.items.map((item) => ({
      ...item,
      brand: group.brand,
    })),
);

export function isColombiaSodaName(name: string): boolean {
  const normalized = normalizeCatalogName(name);
  return COLOMBIA_SODAS_CATALOG.some(
    (item) => normalizeCatalogName(item.name) === normalized,
  );
}
