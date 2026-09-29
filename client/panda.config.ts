import { defineConfig } from '@pandacss/dev'
import { globalCss } from './theme/global-css'
import { keyframes } from './theme/keyframes'
import { semanticTokens, tokens } from './theme/tokens'

export default defineConfig({
  preflight: true,
  jsxFramework: 'react',
  include: ['./app/**/*.{ts,tsx}'],
  exclude: [],
  globalCss,
  theme: {
    extend: {
      tokens,
      semanticTokens,
      keyframes,
    },
  },
  outdir: 'styled-system',
})
