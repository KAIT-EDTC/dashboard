import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { css } from '../../styled-system/css'
import { client } from '../lib/hono'
import RegisterForm from '../components/RegisterForm'

export type RegisterInfo = {
  id: string
  discordUsername: string
  discordAvatar: string | null
  nickname: string | null
  studentInfo: {
    studentId: string
    enrollmentYear: number
    faculty: string
    department: string
    grade: number
  } | null
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [registerInfo, setRegisterInfo] = useState<RegisterInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRegisterInfo = async () => {
      try {
        const res = await client.api.users.register.info.$get()
        if (!res.ok) {
          navigate('/login?error=auth_failed')
          return
        }
        const data = (await res.json()) as RegisterInfo
        setRegisterInfo(data)
      } catch {
        navigate('/login?error=auth_failed')
      } finally {
        setLoading(false)
      }
    }
    fetchRegisterInfo()
  }, [navigate])

  const handleSubmit = async (formData: Record<string, unknown>) => {
    const res = await client.api.users.register.$post({ json: formData })
    if (res.ok) {
      navigate('/dashboard')
    }
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
        {loading ? (
          /* Loading spinner */
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <div
              className={css({
                width: '40px',
                height: '40px',
                border: '3px solid',
                borderColor: 'border.DEFAULT',
                borderTopColor: 'accent',
                borderRadius: 'full',
                animation: 'spin 0.8s linear infinite',
              })}
            />
          </div>
        ) : registerInfo ? (
          <div
            className={css({
              bg: 'bg.island',
              borderRadius: '2xl',
              shadow: 'island',
              maxWidth: '560px',
              width: '100%',
              p: '2xl',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeInUp 0.6s ease',
            })}
          >
            {/* Avatar section */}
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 'lg',
              })}
            >
              {registerInfo.discordAvatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${registerInfo.id}/${registerInfo.discordAvatar}.png`}
                  alt={registerInfo.discordUsername}
                  className={css({
                    width: '72px',
                    height: '72px',
                    borderRadius: 'full',
                    objectFit: 'cover',
                    mb: 'sm',
                    border: '3px solid',
                    borderColor: 'border.DEFAULT',
                  })}
                />
              ) : (
                <div
                  className={css({
                    width: '72px',
                    height: '72px',
                    borderRadius: 'full',
                    bg: 'discord',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.inverse',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    mb: 'sm',
                  })}
                >
                  {registerInfo.discordUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={css({
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'text.primary',
                })}
              >
                {registerInfo.discordUsername}
              </span>
            </div>

            {/* Title */}
            <h1
              className={css({
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'text.primary',
                mb: 'sm',
                textAlign: 'center',
              })}
            >
              プロフィール設定
            </h1>

            {/* Subtitle */}
            <p
              className={css({
                fontSize: '0.875rem',
                color: 'text.secondary',
                lineHeight: '1.7',
                textAlign: 'center',
                mb: 'lg',
              })}
            >
              EDTCへの参加ありがとうございます。Discordのニックネームから学籍情報を自動取得しました。
            </p>

            {/* Register Form */}
            <RegisterForm
              studentInfo={registerInfo.studentInfo}
              onSubmit={handleSubmit}
            />
          </div>
        ) : null}
      </main>
    </div>
  )
}
