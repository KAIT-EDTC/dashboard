import { useSearchParams } from 'react-router'
import { css } from '../../styled-system/css'

const errorMessages: Record<string, string> = {
  not_a_member:
    'EDTCのDiscordサーバーに参加していません。サーバーに参加してから再度ログインしてください。',
  auth_failed: '認証に失敗しました。もう一度お試しください。',
  no_code: '認証コードが取得できませんでした。',
}

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const errorMessage = error ? errorMessages[error] : null

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/auth/login`
  }

  return (
    <div
      className={css({
        minHeight: '100vh',
        bg: 'bg.base',
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      {/* Header */}
      <header
        className={css({
          bg: 'bg.header',
          shadow: 'header',
          display: 'flex',
          alignItems: 'center',
          height: '56px',
          px: 'lg',
          animation: 'fadeIn 0.5s ease',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 'sm',
          })}
        >
          {/* Cube icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={css({ flexShrink: 0 })}
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className={css({
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'text.primary',
              letterSpacing: '-0.02em',
            })}
          >
            EDTC ダッシュボード
          </span>
        </div>
      </header>

      {/* Main */}
      <main
        className={css({
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 'md',
        })}
      >
        <div
          className={css({
            bg: 'bg.island',
            borderRadius: '2xl',
            shadow: 'island',
            maxWidth: '440px',
            width: '100%',
            p: '2xl',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            animation: 'fadeInUp 0.6s ease',
          })}
        >
          {/* Cube icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={css({ mb: 'lg' })}
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Title */}
          <h1
            className={css({
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'text.primary',
              mb: 'sm',
            })}
          >
            EDTCダッシュボードです！
          </h1>

          {/* Description */}
          <p
            className={css({
              fontSize: '0.95rem',
              color: 'text.secondary',
              lineHeight: '1.7',
              mb: 'xs',
            })}
          >
            ブログの作成や備品管理、イベント管理などを行えます！
          </p>
          <p
            className={css({
              fontSize: '0.875rem',
              color: 'text.muted',
              lineHeight: '1.6',
              mb: 'lg',
            })}
          >
            EDTC公式サーバーに入っているメンバーならだれでも参加できます！
          </p>

          {/* Error alert */}
          {errorMessage && (
            <div
              className={css({
                width: '100%',
                bg: 'error.subtle',
                color: 'error.text',
                borderRadius: 'md',
                p: 'md',
                mb: 'lg',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                textAlign: 'left',
              })}
            >
              {errorMessage}
            </div>
          )}

          {/* Discord login button */}
          <button
            onClick={handleLogin}
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'sm',
              width: '100%',
              bg: 'discord',
              color: 'text.inverse',
              border: 'none',
              borderRadius: 'md',
              p: 'md',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              shadow: 'discord',
              _hover: {
                bg: 'discord.hover',
                shadow: 'discord.hover',
                transform: 'translateY(-1px)',
              },
              _active: {
                transform: 'translateY(0)',
              },
            })}
          >
            {/* Discord SVG icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"
                fill="currentColor"
              />
            </svg>
            Discordでログイン
          </button>

          {/* Footer note */}
          <p
            className={css({
              fontSize: '0.75rem',
              color: 'text.muted',
              mt: 'lg',
              lineHeight: '1.5',
            })}
          >
            ※ ログインにはEDTCのDiscordサーバーへの参加が必要です
          </p>
        </div>
      </main>
    </div>
  )
}
