import { useState } from 'react'
import { css } from '../../styled-system/css'

type Props = {
  onSubmit: (data: {
    lastName: string
    firstName: string
    lastNameKana: string
    firstNameKana: string
    division: string
  }) => void
  studentInfo: {
    studentId: string
    enrollmentYear: number
    faculty: string
    department: string
    grade: number
  } | null
  isSubmitting: boolean
  error: string | null
}

const VALID_DIVISIONS = ['営業部', '総務部', '広報部', '企画部', '人事部']

const sectionTitleStyle = css({
  fontSize: '0.75rem',
  fontWeight: '700',
  color: 'accent',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 'md',
})

const labelStyle = css({
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: 'text.secondary',
  marginBottom: 'xs',
})

const inputStyle = css({
  width: '100%',
  padding: 'sm md',
  bg: 'bg.input',
  border: '1px solid',
  borderColor: 'border.DEFAULT',
  borderRadius: 'md',
  fontSize: '0.95rem',
  color: 'text.primary',
  outline: 'none',
  transition: 'all 0.2s ease',
  _focus: {
    borderColor: 'border.focus',
    bg: 'bg.inputFocus',
    shadow: 'input',
  },
  _placeholder: {
    color: 'text.muted',
  },
})

const infoLabelStyle = css({
  fontSize: '0.75rem',
  fontWeight: '600',
  color: 'text.muted',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
})

const infoValueStyle = css({
  fontSize: '0.95rem',
  fontWeight: '600',
  color: 'text.primary',
})

function RegisterForm({ onSubmit, studentInfo, isSubmitting, error }: Props) {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    lastNameKana: '',
    firstNameKana: '',
    division: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Error alert */}
      {error && (
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 'sm',
            padding: 'md',
            bg: 'error.subtle',
            color: 'error.text',
            borderRadius: 'md',
            fontSize: '0.9rem',
            marginBottom: 'lg',
            animation: 'fadeIn 0.3s ease',
          })}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={css({ width: '20px', height: '20px', flexShrink: 0 })}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Student info section */}
      {studentInfo ? (
        <div className={css({ marginBottom: 'lg' })}>
          <h3 className={sectionTitleStyle}>学籍情報 (自動取得)</h3>
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
              <span className={infoLabelStyle}>学籍番号</span>
              <span className={infoValueStyle}>{studentInfo.studentId}</span>
            </div>
            <div>
              <span className={infoLabelStyle}>学年</span>
              <span className={infoValueStyle}>{studentInfo.grade}年</span>
            </div>
            <div>
              <span className={infoLabelStyle}>学部</span>
              <span className={infoValueStyle}>{studentInfo.faculty}</span>
            </div>
            <div>
              <span className={infoLabelStyle}>学科</span>
              <span className={infoValueStyle}>{studentInfo.department}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: 'sm',
            padding: 'md',
            bg: 'error.subtle',
            color: 'error.text',
            borderRadius: 'md',
            fontSize: '0.9rem',
            marginBottom: 'lg',
          })}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={css({ width: '20px', height: '20px', flexShrink: 0 })}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Discordのニックネームから学籍番号が取得できませんでした。<br />
            「学籍番号: 名前」の形式でニックネームを設定してから再度お試しください。
          </span>
        </div>
      )}

      {/* Form section */}
      <div className={css({ marginBottom: 'lg' })}>
        <h3 className={sectionTitleStyle}>基本情報</h3>

        {/* Name row */}
        <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'md', marginBottom: 'md' })}>
          <div>
            <label className={labelStyle} htmlFor="lastName">姓</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className={inputStyle}
              placeholder="山田"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className={labelStyle} htmlFor="firstName">名</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              className={inputStyle}
              placeholder="太郎"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Kana row */}
        <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'md', marginBottom: 'md' })}>
          <div>
            <label className={labelStyle} htmlFor="lastNameKana">姓 (フリガナ)</label>
            <input
              type="text"
              id="lastNameKana"
              name="lastNameKana"
              className={inputStyle}
              placeholder="ヤマダ"
              value={formData.lastNameKana}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className={labelStyle} htmlFor="firstNameKana">名 (フリガナ)</label>
            <input
              type="text"
              id="firstNameKana"
              name="firstNameKana"
              className={inputStyle}
              placeholder="タロウ"
              value={formData.firstNameKana}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* 兼部の人の対応を考える必要がある。とりあえず兼部してない人のみ登録できる状態*/}
        {/* Division select */}
        <div className={css({ marginTop: 'sm' })}>
          <label className={labelStyle} htmlFor="division">所属部署</label>
          <select
            id="division"
            name="division"
            className={inputStyle}
            value={formData.division}
            onChange={handleChange}
            required
          >
            <option value="" disabled>部署を選択してください</option>
            {VALID_DIVISIONS.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || !studentInfo}
        className={css({
          width: '100%',
          padding: 'md',
          background: 'linear-gradient(135deg, {colors.accent}, {colors.accent.hover})',
          color: 'text.inverse',
          border: 'none',
          borderRadius: 'md',
          fontSize: '1rem',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'sm',
          transition: 'all 0.2s ease',
          shadow: 'accent',
          _hover: {
            shadow: 'accent.hover',
            transform: 'translateY(-1px)',
          },
          _disabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
            transform: 'none',
          },
        })}
      >
        {isSubmitting ? (
          <>
            <div
              className={css({
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: 'full',
                animation: 'spin 1s linear infinite',
              })}
            />
            登録処理中...
          </>
        ) : (
          'この内容で登録する'
        )}
      </button>
    </form>
  )
}

export { RegisterForm as default }
