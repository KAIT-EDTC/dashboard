import { hc } from 'hono/client'
import type { AppType } from '../../../server/src/index'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const client = hc<AppType>(API_BASE_URL, {
  init: {
    credentials: 'include',
  },
})
