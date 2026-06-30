import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import authRoute from './routes/auth'
import usersRoute from './routes/users'
import blogRoute from './routes/blog'
import equipmentRoute from './routes/equipment'
import calendarRoute from './routes/calendar'

const app = new Hono<AppEnv>()

// CORS
app.use('/api/*', cors({
  origin: [
    'https://dashboard.kaitedtc.com',
    'http://localhost:5173',
  ],
  credentials: true,
}))

const routes = app
  .route('/api/auth', authRoute)
  .route('/api/users', usersRoute)
  .route('/api/blog', blogRoute)
  .route('/api/equipment', equipmentRoute)
  .route('/api/calendar', calendarRoute)

export default app
export type AppType = typeof routes
