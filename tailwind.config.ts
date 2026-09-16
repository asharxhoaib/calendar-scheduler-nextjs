import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ceff",
          300: "#82adff",
          400: "#5285ff",
          500: "#2f5cf6",
          600: "#1f42d1",
          700: "#1a34a6",
          800: "#182d84",
          900: "#182a69",
        },
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
