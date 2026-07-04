import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        border: "var(--border)",
        "border-active": "var(--border-active)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-dim": "var(--text-dim)",
        accent: "var(--accent)",
        "accent-dim": "var(--accent-dim)",
        "accent-hover": "var(--accent-hover)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "16px",
        "2xl": "20px",
      },
      backdropBlur: {
        xs: "4px",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "dot-pulse": "dotPulse 1.2s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        dotPulse: {
          "0%, 80%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "40%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          from: { boxShadow: "0 0 20px rgba(92,110,248,0.1)" },
          to: { boxShadow: "0 0 40px rgba(92,110,248,0.25)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
