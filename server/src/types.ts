export type AuthUser = {
  id: string,
  username: string
}

export type AppEnv = {
  Bindings: {
    DISCORD_CLIENT_ID: string
    DISCORD_CLIENT_SECRET: string
    DISCORD_REDIRECT_URI: string
    GUILD_ID: string
    JWT_SECRET: string
    FRONTEND_URL: string
    NODE_ENV: string
  }
  Variables: {
    user: AuthUser
  }
}
