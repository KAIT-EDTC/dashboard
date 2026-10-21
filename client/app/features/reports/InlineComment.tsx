import { countChars, REPORT_LIMITS } from '@edtc/shared'
import { useState, type ReactNode } from 'react'
import { css, cva, cx } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { inputStyle } from '~/components/ui/Field'
import { CharCount } from './CharCount'
import { numberBadgeStyle, type RequestMode } from './CommentableText'

const lineStyle = cva({
  base: {
    display: 'flex',
    gap: 'sm',
    px: 'sm',
    py: '6px',
    fontSize: 'sm',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    '& > span:first-child': { flexShrink: 0, fontFamily: 'mono', fontWeight: '700', userSelect: 'none' },
  },
  variants: {
    kind: {
      removed: { bg: 'danger.subtle', color: 'danger.fg', '& > span:last-child': { textDecoration: 'line-through' } },
      added: { bg: 'success.subtle', color: 'success.fg' },
      quoted: { bg: 'danger.subtle', color: 'fg' },
    },
  },
})

/**
 * 書き直し案があれば 元の文（赤・取り消し線）→ 書き直し案（緑）。
 * コメントだけなら、指摘された箇所をそのまま引用する
 */
function Diff({ quote, suggestion, rewriting = suggestion !== null }: { quote: string; suggestion: string | null; rewriting?: boolean }) {
  return (
    <div className={css({ borderRadius: 'md', overflow: 'hidden', borderWidth: '1px' })}>
      {rewriting ? (
        <div className={lineStyle({ kind: 'removed' })}>
          <span>−</span>
          <span>{quote}</span>
        </div>
      ) : (
        <div className={lineStyle({ kind: 'quoted' })}>
          <span aria-hidden="true">“</span>
          <span>{quote}</span>
        </div>
      )}
      {suggestion !== null && (
        <div className={lineStyle({ kind: 'added' })}>
          <span>＋</span>
          <span>{suggestion || '（削除）'}</span>
        </div>
      )}
    </div>
  )
}

const cardStyle = cva({
  base: { display: 'flex', flexDirection: 'column', gap: 'sm', p: 'md', bg: 'surface', borderWidth: '1px', borderRadius: 'md', borderLeftWidth: '3px' },
  variants: {
    done: { true: { opacity: 0.6, borderLeftColor: 'border' }, false: { borderLeftColor: 'danger' } },
  },
})

type CardProps = {
  number: number
  quote: string
  suggestion: string | null
  body: string
  /** applied: 反映済み / outdated: 本文が書き換わって箇所が見つからない */
  state?: 'open' | 'applied' | 'outdated'
  actions?: ReactNode
}

/** 修正依頼1件（PRの変更依頼のように、元の文・書き直し案・コメントを並べる） */
export function RequestCard({ number, quote, suggestion, body, state = 'open', actions }: CardProps) {
  return (
    <div className={cardStyle({ done: state !== 'open' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
        <span className={numberBadgeStyle}>{number}</span>
        {state === 'applied' && <Badge tone="success">反映済み</Badge>}
        {state === 'outdated' && <Badge>書き換え済み</Badge>}
      </div>
      <Diff quote={quote} suggestion={suggestion} />
      {body && <p className={css({ fontSize: 'sm', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{body}</p>}
      {actions && <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>{actions}</div>}
    </div>
  )
}

const modeButton = cva({
  base: { px: '10px', h: '28px', fontSize: 'xs', fontWeight: '600', borderRadius: 'md', cursor: 'pointer', color: 'fg.muted' },
  variants: { active: { true: { bg: 'surface', color: 'fg', shadow: 'card' } } },
})

type ComposerProps = {
  number: number
  quote: string
  mode: RequestMode
  onAdd: (request: { body: string; suggestion: string | null }) => void
  onCancel: () => void
}

/** 選んだ範囲への修正依頼を書く欄。書き直しを提案するときは、選んだ文を下書きとして入れておく */
export function RequestComposer({ number, quote, mode: initialMode, onAdd, onCancel }: ComposerProps) {
  const [mode, setMode] = useState<RequestMode>(initialMode)
  const [suggestion, setSuggestion] = useState(quote)
  const [body, setBody] = useState('')
  const trimmedBody = body.trim()
  const tooLong = countChars(body) > REPORT_LIMITS.reviewComment.max
  const canAdd = !tooLong && (mode === 'suggest' ? suggestion !== quote || trimmedBody.length > 0 : trimmedBody.length > 0)

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', p: 'md', bg: 'surface', borderWidth: '1px', borderColor: 'accent', borderRadius: 'md', shadow: 'card' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
        <span className={numberBadgeStyle}>{number}</span>
        <div className={css({ display: 'inline-flex', gap: '2px', p: '2px', bg: 'surface.muted', borderRadius: 'lg' })}>
          <button type="button" className={modeButton({ active: mode === 'comment' })} onClick={() => setMode('comment')}>
            コメント
          </button>
          <button type="button" className={modeButton({ active: mode === 'suggest' })} onClick={() => setMode('suggest')}>
            書き直しを提案
          </button>
        </div>
      </div>
      {mode === 'suggest' ? (
        <>
          <Diff quote={quote} suggestion={null} rewriting />
          <div className={css({ display: 'flex', gap: 'sm', alignItems: 'flex-start' })}>
            <span className={css({ pt: '8px', fontFamily: 'mono', fontWeight: '700', color: 'success.fg' })}>＋</span>
            <textarea
              aria-label="書き直し案"
              value={suggestion}
              onChange={(e) => setSuggestion(e.currentTarget.value)}
              rows={Math.min(6, Math.max(2, Math.ceil(quote.length / 40)))}
              autoFocus
              className={cx(inputStyle, css({ resize: 'vertical', lineHeight: '1.7' }))}
            />
          </div>
          <textarea
            aria-label="コメント"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            rows={2}
            placeholder="コメント（任意）"
            className={cx(inputStyle, css({ resize: 'vertical', lineHeight: '1.7' }))}
          />
        </>
      ) : (
        <>
          <Diff quote={quote} suggestion={null} />
          <textarea
            aria-label="コメント"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            rows={3}
            autoFocus
            placeholder="どう直してほしいか"
            className={cx(inputStyle, css({ resize: 'vertical', lineHeight: '1.7' }))}
          />
        </>
      )}
      {tooLong && <CharCount value={body} max={REPORT_LIMITS.reviewComment.max} />}
      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!canAdd}
          onClick={() => onAdd({ body: trimmedBody, suggestion: mode === 'suggest' ? suggestion : null })}
        >
          追加
        </Button>
      </div>
    </div>
  )
}
