import type { Config } from '@react-router/dev/config'

// SPAモード: APIはCloudflare Workers側にあるため、クライアントは静的ホスティングのみ
export default {
  ssr: false,
  appDirectory: 'app',
} satisfies Config
