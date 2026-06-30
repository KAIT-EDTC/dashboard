import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,

  include: ["./app/**/*.{js,jsx,ts,tsx}"],
  exclude: [],

  globalCss: {
    html: {
      fontSize: "16px",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    body: {
      fontFamily: "sans",
      bg: "bg.base",
      color: "text.primary",
      lineHeight: "1.6",
      minHeight: "100vh",
      overflowX: "hidden",
    },
    "#root": {
      minHeight: "100vh",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "text.primary",
      fontWeight: "600",
      lineHeight: "1.3",
      letterSpacing: "-0.02em",
    },
    h1: { fontSize: "2rem" },
    h2: { fontSize: "1.5rem" },
    h3: { fontSize: "1.25rem" },
    p: {
      color: "text.secondary",
      lineHeight: "1.7",
    },
    a: {
      color: "accent",
      textDecoration: "none",
      transition: "colors",
    },
    "a:hover": {
      color: "accent.hover",
    },
    /* Scrollbar */
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "{colors.border.DEFAULT}",
      borderRadius: "full",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "{colors.border.hover}",
    },
  },

  theme: {
    tokens: {
      fonts: {
        sans: { value: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
        mono: { value: "'JetBrains Mono', ui-monospace, Consolas, monospace" },
      },
      colors: {
        /* Background */
        "bg.base": { value: "#d4f1f9" },
        "bg.header": { value: "#ffffff" },
        "bg.island": { value: "#ffffff" },
        "bg.sidebar": { value: "#f0f4f8" },
        "bg.sidebarHover": { value: "#e2e8f0" },
        "bg.sidebarActive": { value: "#dbeafe" },
        "bg.input": { value: "#f8fafc" },
        "bg.inputFocus": { value: "#ffffff" },
        "bg.tertiary": { value: "#f1f5f9" },
        "bg.codeBlock": { value: "#f8fafc" },

        /* Text */
        "text.primary": { value: "#1e293b" },
        "text.secondary": { value: "#64748b" },
        "text.muted": { value: "#94a3b8" },
        "text.inverse": { value: "#ffffff" },

        /* Accent */
        accent: { value: "#3b82f6" },
        "accent.hover": { value: "#2563eb" },
        "accent.glow": { value: "rgba(59, 130, 246, 0.2)" },
        "accent.subtle": { value: "rgba(59, 130, 246, 0.08)" },

        /* Discord */
        discord: { value: "#5865F2" },
        "discord.hover": { value: "#4752c4" },

        /* Status */
        success: { value: "#22c55e" },
        "success.subtle": { value: "rgba(34, 197, 94, 0.1)" },
        warning: { value: "#f59e0b" },
        error: { value: "#ef4444" },
        "error.subtle": { value: "rgba(239, 68, 68, 0.08)" },
        "error.text": { value: "#dc2626" },

        /* Border */
        "border.DEFAULT": { value: "#e2e8f0" },
        "border.hover": { value: "#cbd5e1" },
        "border.focus": { value: "#3b82f6" },

        /* Shadow colors */
        "shadow.island": { value: "rgba(0, 0, 0, 0.08)" },
        "shadow.header": { value: "rgba(0, 0, 0, 0.04)" },
      },
      spacing: {
        xs: { value: "4px" },
        sm: { value: "8px" },
        md: { value: "16px" },
        lg: { value: "24px" },
        xl: { value: "32px" },
        "2xl": { value: "48px" },
        "3xl": { value: "64px" },
      },
      radii: {
        sm: { value: "6px" },
        md: { value: "10px" },
        lg: { value: "16px" },
        xl: { value: "20px" },
        "2xl": { value: "24px" },
        full: { value: "9999px" },
      },
      shadows: {
        island: { value: "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)" },
        header: { value: "0 1px 3px rgba(0, 0, 0, 0.04)" },
        sm: { value: "0 1px 3px rgba(0, 0, 0, 0.06)" },
        md: { value: "0 4px 12px rgba(0, 0, 0, 0.08)" },
        lg: { value: "0 8px 24px rgba(0, 0, 0, 0.1)" },
        input: { value: "0 0 0 3px rgba(59, 130, 246, 0.15)" },
        discord: { value: "0 4px 14px rgba(88, 101, 242, 0.3)" },
        "discord.hover": { value: "0 6px 20px rgba(88, 101, 242, 0.4)" },
        accent: { value: "0 4px 14px rgba(59, 130, 246, 0.25)" },
        "accent.hover": { value: "0 6px 20px rgba(59, 130, 246, 0.35)" },
      },
      easings: {
        default: { value: "ease" },
        smooth: { value: "cubic-bezier(0.16, 1, 0.3, 1)" },
      },
      durations: {
        fast: { value: "150ms" },
        normal: { value: "250ms" },
        slow: { value: "400ms" },
      },
    },
    keyframes: {
      fadeIn: {
        from: { opacity: "0" },
        to: { opacity: "1" },
      },
      fadeInUp: {
        from: { opacity: "0", transform: "translateY(16px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
      slideInLeft: {
        from: { opacity: "0", transform: "translateX(-16px)" },
        to: { opacity: "1", transform: "translateX(0)" },
      },
      spin: {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
      float: {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-6px)" },
      },
    },
  },

  outdir: "styled-system",
});
