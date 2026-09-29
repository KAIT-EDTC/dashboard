import { css } from 'styled-system/css'
import { buttonStyle } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { DiscordIcon, LogoIcon } from '~/components/ui/Icons'
import { API_URL } from '~/lib/api'

export function LoginCard({ errorMessage }: { errorMessage: string | null }) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'md' })}>
      <LogoIcon size={48} className={css({ color: 'accent' })} />
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: '700', mb: 'xs' })}>EDTCダッシュボードへようこそ</h1>
        <p className={css({ color: 'fg.muted' })}>イベントの出欠や持ち物、ブログの投稿、メンバー紹介をここで。</p>
      </div>
      {errorMessage && (
        <div className={css({ w: 'full', textAlign: 'left' })}>
          <Alert>{errorMessage}</Alert>
        </div>
      )}
      {/* OAuthはAPIサーバー経由のリダイレクトなので通常のリンクで遷移する */}
      <a href={`${API_URL}/api/auth/login`} className={buttonStyle({ variant: 'discord', size: 'lg', block: true })}>
        <DiscordIcon size={20} />
        Discordでログイン
      </a>
      <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>※ EDTCのDiscordサーバーに参加しているメンバーのみ利用できます</p>
    </div>
  )
}
