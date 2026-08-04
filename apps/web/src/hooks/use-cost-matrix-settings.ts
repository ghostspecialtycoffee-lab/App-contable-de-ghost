"use client";

import { useMemo } from "react";

import { useAuth } from "@/providers/auth-provider";
import { resolveCostMatrixSettings } from "@ghost/domain";

export function useCostMatrixSettings() {
  const { organization } = useAuth();

  return useMemo(
    () => resolveCostMatrixSettings(organization?.costMatrixSettings),
    [organization?.costMatrixSettings],
  );
}
