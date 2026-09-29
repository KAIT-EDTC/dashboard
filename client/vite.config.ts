import { fileURLToPath } from 'node:url'
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      'styled-system': fileURLToPath(new URL('./styled-system', import.meta.url)),
    },
  },
})
