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
        brand: {
          cyan: "var(--brand-cyan)",
          green: "var(--brand-green)",
          pink: "var(--brand-pink)",
          yellow: "var(--brand-yellow)",
          dark: "var(--brand-dark)",
        },
        surface: {
          base: "var(--surface-base)",
          card: "var(--surface-card)",
          muted: "var(--surface-muted)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        state: {
          success: "var(--state-success)",
          successBg: "var(--state-success-bg)",
          danger: "var(--state-danger)",
          dangerBg: "var(--state-danger-bg)",
          warning: "var(--state-warning)",
          warningBg: "var(--state-warning-bg)",
          info: "var(--state-info)",
          infoBg: "var(--state-info-bg)",
        },
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "sans-serif"],
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        focus: "0 0 0 4px var(--focus-ring)",
      },
      spacing: {
        section: "var(--space-section)",
        block: "var(--space-block)",
      },
    },
  },
  plugins: [],
};
export default config;