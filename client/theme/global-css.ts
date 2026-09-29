import { defineGlobalStyles } from '@pandacss/dev'

export const globalCss = defineGlobalStyles({
  // preflight の既定の枠線色。辺ごとの枠線は borderTopWidth などの幅指定だけで描く
  ':root': {
    '--global-color-border': 'var(--colors-border)',
  },
  html: {
    fontSize: '16px',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  body: {
    fontFamily: 'sans',
    bg: 'canvas',
    color: 'fg',
    lineHeight: '1.6',
    minHeight: '100vh',
  },
  'h1, h2, h3, h4': {
    fontWeight: '600',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  a: {
    color: 'accent',
    textDecoration: 'none',
    _hover: { color: 'accent.hover' },
  },
  '::-webkit-scrollbar': { width: '6px', height: '6px' },
  '::-webkit-scrollbar-track': { background: 'transparent' },
  '::-webkit-scrollbar-thumb': { background: '{colors.border}', borderRadius: 'full' },
  '::-webkit-scrollbar-thumb:hover': { background: '{colors.border.strong}' },
})
