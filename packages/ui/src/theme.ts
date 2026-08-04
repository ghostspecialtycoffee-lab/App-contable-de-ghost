export const ghostTheme = {
  colors: {
    brand: {
      50: "#f4f6fb",
      100: "#e8edf7",
      200: "#c9d5ea",
      300: "#a9bddc",
      400: "#6a8abf",
      500: "#2b579f",
      600: "#234681",
      700: "#1b3563",
      800: "#142445",
      900: "#0c1327",
    },
    accent: {
      500: "#d4a574",
      600: "#b8874f",
    },
    success: "#16a34a",
    warning: "#ca8a04",
    danger: "#dc2626",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
} as const;

export type ThemeMode = "light" | "dark" | "system";
