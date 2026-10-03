import { useRef, useState, type ReactNode } from 'react'
import { css, cva } from 'styled-system/css'
import { EditIcon, MessageIcon } from '~/components/ui/Icons'

export type TextRange = { start: number; end: number; quote: string }
export type RequestMode = 'comment' | 'suggest'
/** request: 修正依頼の箇所（赤） / selecting: いまコメントを書いている箇所（青） */
export type Mark = { start: number; end: number; tone: 'request' | 'selecting'; number?: number }

const markStyle = cva({
  base: { color: 'inherit', borderRadius: '2px', borderBottomWidth: '2px' },
  variants: {
    tone: {
      request: { bg: 'danger.subtle', borderColor: 'danger' },
      selecting: { bg: 'accent.subtle', borderColor: 'accent' },
    },
  },
})

export const numberBadgeStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minW: '18px',
  h: '18px',
  px: '4px',
  mx: '2px',
  borderRadius: 'full',
  bg: 'danger',
  color: 'fg.inverted',
  fontSize: '11px',
  fontWeight: '700',
  lineHeight: '1',
  verticalAlign: 'text-top',
  userSelect: 'none',
})

const toolbarButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  px: '10px',
  h: '30px',
  fontSize: 'xs',
  fontWeight: '600',
  color: 'fg',
  bg: 'surface',
  borderRadius: 'md',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  _hover: { bg: 'surface.hover' },
})

/** container の先頭から (node, offset) までの文字数（UTF-16）。番号バッジは数えない */
function offsetIn(container: Node, node: Node, offset: number): number {
  const range = document.createRange()
  range.setStart(container, 0)
  range.setEnd(node, offset)
  const fragment = range.cloneContents()
  fragment.querySelectorAll('[data-badge]').forEach((badge) => badge.remove())
  return fragment.textContent?.length ?? 0
}

/** 範囲の境界で文字列を区切り、それぞれの区間にかかっている印を付ける */
export function segmentsOf(text: string, marks: Mark[]) {
  const points = new Set([0, text.length])
  for (const m of marks) {
    points.add(Math.max(0, Math.min(text.length, m.start)))
    points.add(Math.max(0, Math.min(text.length, m.end)))
  }
  const sorted = [...points].sort((a, b) => a - b)
  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1]
    const covering = marks.filter((m) => m.start < end && m.end > start)
    const tone: Mark['tone'] | null = covering.some((m) => m.tone === 'selecting') ? 'selecting' : covering.length > 0 ? 'request' : null
    // この区間で終わる印の番号は、区間の直後に出す
    const numbers = marks.filter((m) => m.number !== undefined && m.end === end).map((m) => m.number as number)
    return { start, end, tone, numbers }
  })
}

type Props = {
  text: string
  marks?: Mark[]
  /** 渡すと、選んだ範囲の近くに「コメント」「書き直しを提案」が出る */
  onRequest?: (range: TextRange, mode: RequestMode) => void
}

/** 本文の表示。修正依頼の箇所に赤い印と番号を付け、選んだ範囲にその場で依頼を付けられる */
export function CommentableText({ text, marks = [], onRequest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [picked, setPicked] = useState<(TextRange & { top: number; left: number }) | null>(null)

  const handleSelect = () => {
    const container = ref.current
    const selection = window.getSelection()
    if (!onRequest || !container) return
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setPicked(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return
    let start = offsetIn(container, range.startContainer, range.startOffset)
    let end = offsetIn(container, range.endContainer, range.endOffset)
    // 前後の空白・改行は範囲に含めない
    while (start < end && /\s/.test(text[start])) start++
    while (end > start && /\s/.test(text[end - 1])) end--
    if (end <= start) {
      setPicked(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const box = container.getBoundingClientRect()
    setPicked({
      start,
      end,
      quote: text.slice(start, end),
      top: rect.bottom - box.top + 6,
      left: Math.max(0, Math.min(rect.left - box.left, box.width - 240)),
    })
  }

  const choose = (mode: RequestMode) => {
    if (!picked || !onRequest) return
    onRequest({ start: picked.start, end: picked.end, quote: picked.quote }, mode)
    setPicked(null)
    window.getSelection()?.removeAllRanges()
  }

  const content: ReactNode[] = []
  for (const segment of segmentsOf(text, marks)) {
    const value = text.slice(segment.start, segment.end)
    content.push(
      segment.tone ? (
        <mark key={`m${segment.start}`} className={markStyle({ tone: segment.tone })}>
          {value}
        </mark>
      ) : (
        value
      ),
    )
    for (const number of segment.numbers) {
      content.push(
        <span key={`n${number}`} data-badge className={numberBadgeStyle}>
          {number}
        </span>,
      )
    }
  }

  return (
    <div className={css({ position: 'relative' })}>
      <div
        ref={ref}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        className={css({ fontSize: 'sm', lineHeight: '1.9', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', cursor: onRequest ? 'text' : undefined })}
      >
        {content}
      </div>
      {picked && (
        <div
          role="toolbar"
          aria-label="選んだ範囲への修正依頼"
          // ボタンを押してもテキストの選択が外れないようにする
          onMouseDown={(e) => e.preventDefault()}
          style={{ top: picked.top, left: picked.left }}
          className={css({ position: 'absolute', zIndex: 10, display: 'flex', gap: '2px', p: '3px', bg: 'surface', borderWidth: '1px', borderRadius: 'lg', shadow: 'raised' })}
        >
          <button type="button" className={toolbarButton} onClick={() => choose('comment')}>
            <MessageIcon size={14} />
            コメント
          </button>
          <button type="button" className={toolbarButton} onClick={() => choose('suggest')}>
            <EditIcon size={14} />
            書き直しを提案
          </button>
        </div>
      )}
    </div>
  )
}
