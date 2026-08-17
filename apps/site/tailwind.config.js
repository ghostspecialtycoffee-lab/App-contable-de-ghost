/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#FAFAFA",
        "paper-warm": "#F4F1EC",
        wood: {
          1: "#E8DCC8",
          2: "#D4C0A0",
          3: "#C9B08A",
          4: "#A89070",
          5: "#7A6348",
        },
        cement: {
          1: "#D9D6D0",
          2: "#B8B5B0",
          3: "#8A8680",
          4: "#6E6B66",
          5: "#4A4845",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
