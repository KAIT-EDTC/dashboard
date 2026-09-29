import { defineSemanticTokens, defineTokens } from '@pandacss/dev'

export const tokens = defineTokens({
  fonts: {
    sans: {
      value:
        "'Inter', system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif",
    },
    mono: { value: "'JetBrains Mono', ui-monospace, Consolas, monospace" },
  },
  spacing: {
    xs: { value: '4px' },
    sm: { value: '8px' },
    md: { value: '16px' },
    lg: { value: '24px' },
    xl: { value: '32px' },
    '2xl': { value: '48px' },
    '3xl': { value: '64px' },
  },
  radii: {
    sm: { value: '6px' },
    md: { value: '10px' },
    lg: { value: '16px' },
    xl: { value: '20px' },
    '2xl': { value: '24px' },
    full: { value: '9999px' },
  },
  shadows: {
    island: { value: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)' },
    header: { value: '0 1px 3px rgba(0, 0, 0, 0.04)' },
    card: { value: '0 1px 3px rgba(0, 0, 0, 0.06)' },
    raised: { value: '0 8px 24px rgba(0, 0, 0, 0.1)' },
    focus: { value: '0 0 0 3px rgba(59, 130, 246, 0.2)' },
  },
  durations: {
    fast: { value: '150ms' },
    normal: { value: '250ms' },
  },
})

/** コンポーネントからはこちらの意味ベースの名前だけを使う */
export const semanticTokens = defineSemanticTokens({
  colors: {
    canvas: { value: '#d4f1f9' },
    sidebar: { value: '#f0f4f8' },
    surface: {
      DEFAULT: { value: '#ffffff' },
      subtle: { value: '#f8fafc' },
      muted: { value: '#f1f5f9' },
      hover: { value: '#e2e8f0' },
      selected: { value: '#dbeafe' },
    },
    fg: {
      DEFAULT: { value: '#1e293b' },
      muted: { value: '#64748b' },
      subtle: { value: '#94a3b8' },
      inverted: { value: '#ffffff' },
    },
    border: {
      DEFAULT: { value: '#e2e8f0' },
      strong: { value: '#cbd5e1' },
      focus: { value: '#3b82f6' },
    },
    accent: {
      DEFAULT: { value: '#3b82f6' },
      hover: { value: '#2563eb' },
      fg: { value: '#1d4ed8' },
      subtle: { value: 'rgba(59, 130, 246, 0.1)' },
    },
    discord: {
      DEFAULT: { value: '#5865F2' },
      hover: { value: '#4752c4' },
    },
    success: {
      DEFAULT: { value: '#22c55e' },
      fg: { value: '#15803d' },
      subtle: { value: 'rgba(34, 197, 94, 0.12)' },
    },
    warning: {
      DEFAULT: { value: '#f59e0b' },
      fg: { value: '#b45309' },
      subtle: { value: 'rgba(245, 158, 11, 0.14)' },
    },
    danger: {
      DEFAULT: { value: '#ef4444' },
      hover: { value: '#dc2626' },
      fg: { value: '#dc2626' },
      subtle: { value: 'rgba(239, 68, 68, 0.08)' },
    },
  },
})
