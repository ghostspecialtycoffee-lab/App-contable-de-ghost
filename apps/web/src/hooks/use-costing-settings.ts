"use client";

import { useMemo } from "react";

import { useAuth } from "@/providers/auth-provider";
import { resolveCostingSettings } from "@ghost/domain";

export function useCostingSettings() {
  const { organization } = useAuth();

  return useMemo(
    () => resolveCostingSettings(organization?.costingSettings),
    [organization?.costingSettings],
  );
}
