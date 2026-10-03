import { REPORT_LIMITS } from '@edtc/shared'
import { useState, type ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Button } from '~/components/ui/Button'
import { TextareaField } from '~/components/ui/Field'
import { CharCount } from './CharCount'

/** 「選んだ範囲」の引用 */
export function Quote({ children }: { children: string }) {
  return (
    <blockquote className={css({ pl: 'sm', borderLeftWidth: '3px', borderColor: 'warning', color: 'fg.muted', fontSize: 'xs', lineClamp: 3, whiteSpace: 'pre-wrap' })}>
      {children}
    </blockquote>
  )
}

/** 範囲コメント1件（引用＋本文） */
export function InlineCommentItem({ quote, body, action }: { quote: string; body: string; action?: ReactNode }) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', p: 'sm', bg: 'surface.subtle', borderWidth: '1px', borderRadius: 'md' })}>
      <Quote>{quote}</Quote>
      <p className={css({ fontSize: 'sm', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{body}</p>
      {action && <div className={css({ display: 'flex', justifyContent: 'flex-end' })}>{action}</div>}
    </div>
  )
}

/** 選んだ範囲へのコメントを書く欄 */
export function InlineCommentComposer({ quote, onAdd, onCancel }: { quote: string; onAdd: (body: string) => void; onCancel: () => void }) {
  const [body, setBody] = useState('')
  const trimmed = body.trim()
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', p: 'md', borderWidth: '1px', borderColor: 'accent', borderRadius: 'md', bg: 'surface' })}>
      <Quote>{quote}</Quote>
      <TextareaField
        label="この範囲へのコメント"
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        rows={3}
        autoFocus
        placeholder="どう直してほしいか"
        hint={<CharCount value={body} max={REPORT_LIMITS.reviewComment.max} />}
      />
      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button size="sm" variant="primary" disabled={!trimmed || [...trimmed].length > REPORT_LIMITS.reviewComment.max} onClick={() => onAdd(trimmed)}>
          コメントを追加
        </Button>
      </div>
    </div>
  )
}
