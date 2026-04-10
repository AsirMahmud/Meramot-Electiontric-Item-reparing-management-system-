import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: "#bbd9b5",
        mintDark: "#A3D9A5",
        darkGrey: "#2E2E2E",
        grey: "#6F6F6F",
      },
    },
  },
  plugins: [],
} satisfies Config;
