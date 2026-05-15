import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// cors
app.use('/api/*', cors())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const routes = app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono!' })
})

export type AppType = typeof routes
export default app
