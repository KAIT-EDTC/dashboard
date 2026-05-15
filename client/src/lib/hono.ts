import { hc } from 'hono/client'
import type { AppType } from '../../../server/src/index'

//const API_BASE_URL = env.SERVER_URL || 'http://localhost:8787/'
export const client = hc<AppType>('http://localhost:8788')
