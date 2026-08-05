import { MENU_CATEGORIES, type MenuCategory } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, query, where, type Query } from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";

export function normalizeMenuCategory(category: string | undefined): MenuCategory {
  if (category && MENU_CATEGORIES.includes(category as MenuCategory)) {
    return category as MenuCategory;
  }
  return "other";
}

/** Consulta compatible con reglas públicas: solo productos activos (sin orderBy para evitar índice compuesto). */
export function buildActiveMenuProductsQuery(organizationId: string): Query {
  return query(
    collection(getFirestoreDb(), firestorePaths.organizationMenuProducts(organizationId)),
    where("status", "==", "active"),
  );
}
