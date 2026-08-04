"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@ghost/ui";

export function ThemeToggle() {
  const { resolvedMode, toggleMode } = useTheme();

  return (
    <Button variant="ghost" size="sm" onClick={toggleMode} aria-label="Cambiar tema">
      {resolvedMode === "dark" ? "Modo claro" : "Modo oscuro"}
    </Button>
  );
}
