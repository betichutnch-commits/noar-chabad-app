import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // קריטי: טעינת מחלקות מתוך קבצי הקונפיגורציה והלוגיקה
  ],
  theme: {
    extend: {
      colors: {
        // הגדרת צבעי המותג לשימוש נקי (למשל: bg-brand-cyan)
        brand: {
          cyan: "var(--brand-cyan)",    // #00BCD4
          green: "var(--brand-green)",  // #8BC34A
          pink: "var(--brand-pink)",    // #E91E63
          yellow: "var(--brand-yellow)",// #FFC107
          dark: "var(--brand-dark)",    // #263238
        },
        bg: {
          light: "var(--bg-light)",     // #F8F9FA
        },
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;