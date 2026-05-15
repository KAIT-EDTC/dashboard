import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppEnv>()

app.use('*', authMiddleware)

const equipmentRoute = app
  .get('/list', (c) => {
    return c.json({
      data: [{ id: '0', name: 'イーゼル', count: 2, located: 'E3倉庫' }]
    })
  })

export default equipmentRoute
