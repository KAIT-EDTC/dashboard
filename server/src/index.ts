import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import authRoute from './routes/auth'
import equipmentRoute from './routes/equipment'

const app = new Hono<AppEnv>()

// cors
app.use('/api/*', cors({
  origin: [
    'https://dashboard.kaitedtc.com',
    'http://localhost:5173'
  ],
  credentials: true,
}))

const routes = app
  .route('api/auth', authRoute)
  .route('api/equipment', equipmentRoute)

export default app
export type AppType = typeof routes
