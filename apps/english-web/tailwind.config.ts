import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/study-ui/src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        muted: "var(--muted)",
        line: "var(--line)",
        text: "var(--text)",
        sub: "var(--sub)",
        brand: "var(--brand)",
        brandSoft: "var(--brand-soft)",
        good: "var(--good)",
        warn: "var(--warn)",
        bad: "var(--bad)",
      },
    },
  },
  plugins: [],
};

export default config;
