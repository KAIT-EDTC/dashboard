import { useRef } from 'react'
import { css, cva } from 'styled-system/css'

export type TextRange = { start: number; end: number; quote: string }
export type Highlight = { start: number; end: number; tone: 'comment' | 'selecting' }

const markStyle = cva({
  base: { color: 'inherit', borderRadius: '2px' },
  variants: {
    tone: {
      comment: { bg: 'warning.subtle', borderBottomWidth: '2px', borderColor: 'warning' },
      selecting: { bg: 'accent.subtle', borderBottomWidth: '2px', borderColor: 'accent' },
    },
  },
})

/** container の先頭から (node, offset) までの文字数（UTF-16） */
function offsetIn(container: Node, node: Node, offset: number): number {
  const range = document.createRange()
  range.setStart(container, 0)
  range.setEnd(node, offset)
  return range.toString().length
}

/** 範囲の境界で文字列を区切り、それぞれの区間にかかっているハイライトを付ける */
function segmentsOf(text: string, highlights: Highlight[]) {
  const points = new Set([0, text.length])
  for (const h of highlights) {
    points.add(Math.max(0, Math.min(text.length, h.start)))
    points.add(Math.max(0, Math.min(text.length, h.end)))
  }
  const sorted = [...points].sort((a, b) => a - b)
  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1]
    const covering = highlights.filter((h) => h.start < end && h.end > start)
    const tone: Highlight['tone'] | null = covering.some((h) => h.tone === 'selecting') ? 'selecting' : covering.length > 0 ? 'comment' : null
    return { start, end, tone }
  })
}

/**
 * 本文を表示し、ドラッグで選んだ範囲を onSelect で返す（PRレビューの行コメントのように使う）。
 * 改行・空白はそのまま表示するので、選んだ位置は本文の文字列上の位置と一致する
 */
export function CommentableText({ text, highlights = [], onSelect }: { text: string; highlights?: Highlight[]; onSelect?: (range: TextRange) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  const handleSelect = () => {
    const container = ref.current
    const selection = window.getSelection()
    if (!onSelect || !container || !selection || selection.isCollapsed || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return
    let start = offsetIn(container, range.startContainer, range.startOffset)
    let end = offsetIn(container, range.endContainer, range.endOffset)
    // 前後の空白・改行は範囲に含めない
    while (start < end && /\s/.test(text[start])) start++
    while (end > start && /\s/.test(text[end - 1])) end--
    if (end <= start) return
    onSelect({ start, end, quote: text.slice(start, end) })
  }

  return (
    <div
      ref={ref}
      onMouseUp={handleSelect}
      onKeyUp={handleSelect}
      className={css({ fontSize: 'sm', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', cursor: onSelect ? 'text' : undefined })}
    >
      {segmentsOf(text, highlights).map((segment) =>
        segment.tone ? (
          <mark key={segment.start} className={markStyle({ tone: segment.tone })}>
            {text.slice(segment.start, segment.end)}
          </mark>
        ) : (
          text.slice(segment.start, segment.end)
        ),
      )}
    </div>
  )
}
