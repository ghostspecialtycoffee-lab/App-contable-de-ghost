"use client";

import { usePathname } from "next/navigation";

import {
  getSalesPaths,
  isSalesExtensionPath,
  type SalesPathKey,
} from "@/lib/navigation/sales-extension";

export function useSalesPaths() {
  const pathname = usePathname();
  const inSalesExtension = isSalesExtensionPath(pathname);
  const paths = getSalesPaths(inSalesExtension);

  function path(key: SalesPathKey): string {
    return paths[key];
  }

  return {
    inSalesExtension,
    paths,
    path,
  };
}
