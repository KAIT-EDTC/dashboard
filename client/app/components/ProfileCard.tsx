import { css } from '../../styled-system/css'
import type { AuthUser } from '../lib/auth'

type Props = {
  user: AuthUser
}

function ProfileCard({ user }: Props) {
  return (
    <div
      className={css({
        border: '1px solid',
        borderColor: 'border.DEFAULT',
        borderRadius: 'xl',
        padding: 'xl',
        bg: 'bg.island',
        animation: 'fadeInUp 0.4s ease',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'lg',
          marginBottom: 'lg',
        })}
      >
        {/* Avatar */}
        <div
          className={css({
            flexShrink: 0,
            width: '96px',
            height: '96px',
            borderRadius: 'full',
            padding: '3px',
            background: 'linear-gradient(135deg, {colors.accent}, {colors.discord})',
          })}
        >
          {user.discordAvatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.discordAvatar}.png`}
              alt="Profile"
              className={css({
                width: '100%',
                height: '100%',
                borderRadius: 'full',
                objectFit: 'cover',
                display: 'block',
              })}
              onError={(e) => {
                e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
              }}
            />
          ) : (
            <div
              className={css({
                width: '100%',
                height: '100%',
                borderRadius: 'full',
                bg: 'discord',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.inverse',
                fontSize: '2rem',
                fontWeight: '700',
              })}
            >
              {user.discordUsername.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className={css({ flex: 1, minWidth: 0 })}>
          <h2
            className={css({
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'text.primary',
              marginBottom: 'xs',
            })}
          >
            {user.lastName} {user.firstName}
          </h2>
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: 'sm',
              color: 'text.muted',
              fontSize: '0.9rem',
              marginBottom: 'md',
            })}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className={css({ width: '16px', height: '16px', color: 'discord' })}>
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            @{user.discordUsername}
          </div>
          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
            <span
              className={css({
                display: 'inline-block',
                padding: '2px 12px',
                borderRadius: 'full',
                fontSize: '0.8rem',
                fontWeight: '600',
                bg: 'accent',
                color: 'text.inverse',
              })}
            >
              {user.division}
            </span>
            <span
              className={css({
                display: 'inline-block',
                padding: '2px 12px',
                borderRadius: 'full',
                fontSize: '0.8rem',
                fontWeight: '600',
                bg: 'success',
                color: 'text.inverse',
              })}
            >
              {new Date().getFullYear() - user.enrollmentYear + 1}年生
            </span>
            <span
              className={css({
                display: 'inline-block',
                padding: '2px 12px',
                borderRadius: 'full',
                fontSize: '0.8rem',
                fontWeight: '500',
                bg: 'bg.tertiary',
                color: 'text.secondary',
              })}
            >
              {user.faculty}
            </span>
            <span
              className={css({
                display: 'inline-block',
                padding: '2px 12px',
                borderRadius: 'full',
                fontSize: '0.8rem',
                fontWeight: '500',
                bg: 'bg.tertiary',
                color: 'text.secondary',
              })}
            >
              {user.department}
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'md',
          padding: 'md',
          bg: 'bg.tertiary',
          borderRadius: 'md',
        })}
      >
        <div>
          <span
            className={css({
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'text.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'xs',
            })}
          >
            学籍番号
          </span>
          <span className={css({ fontSize: '0.95rem', fontWeight: '600', color: 'text.primary' })}>
            {user.studentId}
          </span>
        </div>
        <div>
          <span
            className={css({
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'text.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'xs',
            })}
          >
            フリガナ
          </span>
          <span className={css({ fontSize: '0.95rem', fontWeight: '600', color: 'text.primary' })}>
            {user.lastNameKana} {user.firstNameKana}
          </span>
        </div>
        <div>
          <span
            className={css({
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'text.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'xs',
            })}
          >
            入学年度
          </span>
          <span className={css({ fontSize: '0.95rem', fontWeight: '600', color: 'text.primary' })}>
            {user.enrollmentYear}年度
          </span>
        </div>
        <div>
          <span
            className={css({
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'text.muted',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'xs',
            })}
          >
            登録日
          </span>
          <span className={css({ fontSize: '0.95rem', fontWeight: '600', color: 'text.primary' })}>
            {new Date(user.createdAt).toLocaleDateString('ja-JP')}
          </span>
        </div>
      </div>
    </div>
  )
}

export { ProfileCard as default }
