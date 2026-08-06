import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ghost: {
          brand: "var(--ghost-brand-500)",
          "brand-fg": "var(--ghost-brand-fg)",
          accent: "var(--ghost-accent-500)",
          surface: {
            0: "var(--ghost-surface-0)",
            1: "var(--ghost-surface-1)",
            2: "var(--ghost-surface-2)",
            3: "var(--ghost-surface-3)",
          },
          border: "var(--ghost-border)",
          text: "var(--ghost-text)",
          muted: "var(--ghost-text-muted)",
          success: "var(--ghost-success)",
          warning: "var(--ghost-warning)",
          danger: "var(--ghost-danger)",
        },
      },
      boxShadow: {
        ghost: "0 2px 8px hsl(var(--ghost-shadow-color) / 0.08)",
        "ghost-lg": "0 8px 32px hsl(var(--ghost-shadow-color) / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
