export type AuthUser = {
  id: string
  username: string
}

type D1Database = any

export type AppEnv = {
  Bindings: {
    DB: D1Database
    DISCORD_CLIENT_ID: string
    DISCORD_CLIENT_SECRET: string
    DISCORD_REDIRECT_URI: string
    DISCORD_BOT_TOKEN: string
    GUILD_ID: string
    JWT_SECRET: string
    FRONTEND_URL: string
    GITHUB_TOKEN: string
    NODE_ENV: string
  }
  Variables: {
    user: AuthUser
  }
}
