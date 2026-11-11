import { useRef, useState, type ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Button } from './Button'
import { PlusIcon } from './Icons'

type Props = {
  onFiles: (files: File[]) => void
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
}

/** 「＋ ファイルを追加」ボタンか、ドラッグ＆ドロップでファイルを受け取る領域 */
export function FileDropZone({ onFiles, disabled, loading, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const pick = (list: FileList | null) => {
    if (list && list.length > 0) onFiles(Array.from(list))
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!disabled) pick(e.dataTransfer.files)
      }}
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'sm',
        p: '12px',
        borderWidth: '1px',
        borderStyle: 'dashed',
        borderColor: over ? 'accent' : 'border',
        bg: over ? 'accent.subtle' : 'surface.subtle',
        borderRadius: 'md',
        transition: 'border-color 0.15s, background 0.15s',
      })}
    >
      <Button type="button" size="sm" disabled={disabled} loading={loading} onClick={() => inputRef.current?.click()}>
        <PlusIcon size={14} />
        ファイルを追加
      </Button>
      <span className={css({ fontSize: 'xs', color: 'fg.muted' })}>{children ?? 'またはここにドラッグ＆ドロップ'}</span>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => {
        pick(e.currentTarget.files)
        e.currentTarget.value = ''
      }} />
    </div>
  )
}
