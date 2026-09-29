import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { css, cx } from 'styled-system/css'
import { inputStyle } from '~/components/ui/Field'
import { ImageIcon, LinkIcon } from '~/components/ui/Icons'
import { Spinner } from '~/components/ui/Spinner'
import { uploadImageFile } from './image'

type Props = {
  postId: string
  value: string
  onChange: (value: string) => void
}

type Edit = { text: string; selectionStart: number; selectionEnd: number }

/** 選択範囲を before/after で囲む。未選択なら placeholder を挿入して選択状態にする */
function wrap(value: string, start: number, end: number, before: string, after: string, placeholder: string): Edit {
  const selected = value.slice(start, end) || placeholder
  return {
    text: value.slice(0, start) + before + selected + after + value.slice(end),
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  }
}

/** 選択範囲を含む各行の先頭に prefix を付ける */
function prefixLines(value: string, start: number, end: number, prefix: (i: number) => string): Edit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lines = value.slice(lineStart, end).split('\n')
  const replaced = lines.map((line, i) => prefix(i) + line).join('\n')
  return {
    text: value.slice(0, lineStart) + replaced + value.slice(end),
    selectionStart: lineStart,
    selectionEnd: lineStart + replaced.length,
  }
}

/** 画像をカーソル位置に独立した段落として挿入し、alt（説明）の入力位置にカーソルを置く */
function insertImage(value: string, at: number, fileName: string): Edit {
  const before = value.slice(0, at)
  const after = value.slice(at)
  const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const trail = after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const cursor = before.length + lead.length + 2
  return {
    text: `${before}${lead}![](./${fileName})${trail}${after}`,
    selectionStart: cursor,
    selectionEnd: cursor,
  }
}

const TOOLS: { title: string; content: ReactNode; build: (value: string, start: number, end: number) => Edit }[] = [
  { title: '見出し', content: 'H', build: (v, s, e) => prefixLines(v, s, e, () => '## ') },
  { title: '太字', content: 'B', build: (v, s, e) => wrap(v, s, e, '**', '**', '太字') },
  { title: '箇条書き', content: '・', build: (v, s, e) => prefixLines(v, s, e, () => '- ') },
  { title: '番号付きリスト', content: '1.', build: (v, s, e) => prefixLines(v, s, e, (i) => `${i + 1}. `) },
  { title: '引用', content: '“', build: (v, s, e) => prefixLines(v, s, e, () => '> ') },
  { title: 'リンク', content: <LinkIcon size={15} />, build: (v, s, e) => wrap(v, s, e, '[', '](https://)', 'リンクの文字') },
]

const toolButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minW: '32px',
  h: '30px',
  px: '6px',
  fontSize: 'sm',
  fontWeight: '700',
  color: 'fg.muted',
  borderRadius: 'sm',
  cursor: 'pointer',
  _hover: { bg: 'surface.hover', color: 'fg' },
  _disabled: { opacity: 0.5, cursor: 'not-allowed' },
})

export function MarkdownEditor({ postId, value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // アップロード完了時点の最新の本文に挿入するため、最新値を参照できるようにしておく
  const valueRef = useRef(value)
  useLayoutEffect(() => {
    valueRef.current = value
  })
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const apply = (edit: Edit) => {
    onChange(edit.text)
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    })
  }

  const run = (build: (value: string, start: number, end: number) => Edit) => {
    const textarea = textareaRef.current
    if (!textarea) return
    apply(build(value, textarea.selectionStart, textarea.selectionEnd))
  }

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length === 0) return
    setError(null)
    for (const file of images) {
      const at = textareaRef.current?.selectionStart ?? valueRef.current.length
      setUploading((n) => n + 1)
      try {
        const fileName = await uploadImageFile(postId, file)
        apply(insertImage(valueRef.current, Math.min(at, valueRef.current.length), fileName))
      } catch (e) {
        setError(e instanceof Error ? e.message : '画像のアップロードに失敗しました')
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', h: 'full' })}>
      <div
        role="toolbar"
        aria-label="書式"
        className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', p: '4px', bg: 'surface.muted', borderRadius: 'md' })}
      >
        {TOOLS.map((tool) => (
          <button key={tool.title} type="button" title={tool.title} aria-label={tool.title} className={toolButton} onClick={() => run(tool.build)}>
            {tool.content}
          </button>
        ))}
        <span className={css({ w: '1px', h: '18px', bg: 'border.strong', mx: '4px' })} />
        <button type="button" className={cx(toolButton, css({ gap: '4px', fontWeight: '600' }))} onClick={() => fileRef.current?.click()}>
          {uploading > 0 ? <Spinner size="sm" /> : <ImageIcon size={15} />}
          画像
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void uploadFiles([...(e.currentTarget.files ?? [])])
            e.currentTarget.value = ''
          }}
        />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onPaste={(e) => {
          const files = [...e.clipboardData.files]
          if (files.some((file) => file.type.startsWith('image/'))) {
            e.preventDefault()
            void uploadFiles(files)
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (e.dataTransfer.files.length === 0) return
          e.preventDefault()
          void uploadFiles([...e.dataTransfer.files])
        }}
        aria-label="本文（Markdown）"
        placeholder={'Markdownで書けます。\n\n## 見出し\n\n本文は空行で段落を分けます。\n画像は貼り付け・ドラッグ＆ドロップでも追加できます。'}
        className={cx(inputStyle, css({ flex: 1, minH: '480px', resize: 'vertical', fontFamily: 'mono', fontSize: 'sm', lineHeight: '1.8' }))}
      />
      <p className={css({ fontSize: 'xs', color: error ? 'danger.fg' : 'fg.subtle' })}>
        {error ?? '改行だけでは段落は分かれません。段落を変えるときは空行を入れてください。画像の ![ ] の中には写真の説明を書いてください。'}
      </p>
    </div>
  )
}
