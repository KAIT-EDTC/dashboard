import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppEnv>()

const calendarRoute = app
  .use('/*', authMiddleware)
  .get('/events', (c) => {
    return c.json({ message: 'カレンダー機能は準備中です', events: [] })
  })

export default calendarRoute
