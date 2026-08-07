/** Referencia de tokens — la fuente de verdad vive en apps/web/src/app/globals.css */
export const ghostTheme = {
  colors: {
    brand: {
      500: "#3d2914",
      600: "#2a1c0e",
      fg: "#fffbf5",
    },
    accent: {
      500: "#c4893b",
      600: "#a6702f",
      fg: "#fffbf5",
    },
    surface: {
      0: "#f7f3ed",
      1: "#fffbf5",
      2: "#efe8dc",
      3: "#e2d9ca",
    },
    border: "#ddd3c4",
    text: "#1f1408",
    muted: "#7a6b58",
    success: "#15803d",
    warning: "#b45309",
    danger: "#b42318",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.25rem",
    "3xl": "1.5rem",
  },
} as const;

export type ThemeMode = "light" | "dark" | "system";
