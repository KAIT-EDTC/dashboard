import type { ReactNode } from 'react'
import { cva } from 'styled-system/css'
import { AlertIcon, CheckIcon } from './Icons'

const alertStyle = cva({
  base: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'sm',
    p: '12px',
    fontSize: 'sm',
    borderRadius: 'md',
    borderWidth: '1px',
    whiteSpace: 'pre-line',
    '& svg': { flexShrink: 0, mt: '2px' },
  },
  variants: {
    tone: {
      danger: { bg: 'danger.subtle', color: 'danger.fg', borderColor: 'danger.subtle' },
      warning: { bg: 'warning.subtle', color: 'warning.fg', borderColor: 'warning.subtle' },
      success: { bg: 'success.subtle', color: 'success.fg', borderColor: 'success.subtle' },
      info: { bg: 'accent.subtle', color: 'accent.fg', borderColor: 'accent.subtle' },
    },
  },
})

type Tone = 'danger' | 'warning' | 'success' | 'info'

export function Alert({ tone = 'danger', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={alertStyle({ tone })}>
      {tone === 'success' ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
      <div>{children}</div>
    </div>
  )
}
