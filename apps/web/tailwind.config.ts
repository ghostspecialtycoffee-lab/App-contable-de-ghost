import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ghost: {
          brand: "var(--ghost-brand-500)",
          accent: "var(--ghost-accent-500)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
