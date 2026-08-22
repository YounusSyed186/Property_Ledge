import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-subtle": "var(--surface-subtle)",
        muted: "var(--muted)",
        "muted-dark": "var(--muted-dark)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
        },
        border: "var(--border)",
        success: "var(--success)",
        admin: {
          background: "var(--admin-background)",
          sidebar: "var(--admin-sidebar)",
          "sidebar-surface": "var(--admin-sidebar-surface)",
          "sidebar-border": "var(--admin-sidebar-border)",
          "sidebar-border-subtle": "var(--admin-sidebar-border-subtle)",
          "sidebar-foreground": "var(--admin-sidebar-foreground)",
          "sidebar-muted": "var(--admin-sidebar-muted)",
          surface: "var(--admin-surface)",
          "surface-elevated": "var(--admin-surface-elevated)",
          "surface-subtle": "var(--admin-surface-subtle)",
          border: "var(--admin-border)",
          "border-subtle": "var(--admin-border-subtle)",
          divider: "var(--admin-divider)",
          primary: "var(--admin-primary)",
          "primary-hover": "var(--admin-primary-hover)",
          "primary-soft": "var(--admin-primary-soft)",
          success: "var(--admin-success)",
          "success-soft": "var(--admin-success-soft)",
          warning: "var(--admin-warning)",
          danger: "var(--admin-danger)",
          foreground: "var(--admin-foreground)",
          muted: "var(--admin-muted)",
          "muted-foreground": "var(--admin-muted-foreground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
      },
      boxShadow: {
        "subtle-card": "0 20px 60px -15px var(--shadow-color)",
        "mockup": "0 25px 80px -20px var(--shadow-color), 0 0 0 1px var(--border)",
        "mockup-sm": "0 10px 30px -10px var(--shadow-color), 0 0 0 1px var(--border)",
      },
      radius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};
export default config;
