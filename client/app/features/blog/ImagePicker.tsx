import { useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Button } from '~/components/ui/Button'
import { ImageIcon } from '~/components/ui/Icons'
import { Spinner } from '~/components/ui/Spinner'
import { blogImageUrl, uploadImageFile } from './image'

type Props = {
  postId: string
  fileName: string | null
  onChange: (fileName: string | null) => void
  label: string
}

/** 画像を選ぶとWebPに変換してすぐアップロードし、ファイル名を返す */
export function ImagePicker({ postId, fileName, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      onChange(await uploadImageFile(postId, file))
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.currentTarget.files?.[0])} aria-label={label} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          upload(e.dataTransfer.files[0])
        }}
        disabled={uploading}
        className={css({
          position: 'relative',
          aspectRatio: '16 / 9',
          w: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'xs',
          overflow: 'hidden',
          color: 'fg.subtle',
          fontSize: 'sm',
          bg: 'surface.subtle',
          borderWidth: '1px',
          borderStyle: 'dashed',
          borderColor: 'border.strong',
          borderRadius: 'md',
          cursor: 'pointer',
          _hover: { borderColor: 'accent', color: 'accent' },
        })}
      >
        {fileName ? (
          <img src={blogImageUrl(postId, fileName)} alt="" className={css({ position: 'absolute', inset: 0, w: 'full', h: 'full', objectFit: 'cover' })} />
        ) : (
          <>
            <ImageIcon size={28} />
            {label}を選択（ドラッグ＆ドロップも可）
          </>
        )}
        {uploading && (
          <span className={css({ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bg: 'rgba(255,255,255,0.7)', color: 'accent' })}>
            <Spinner />
          </span>
        )}
      </button>
      {fileName && (
        <div className={css({ display: 'flex', gap: 'xs' })}>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            変更
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={uploading}>
            削除
          </Button>
        </div>
      )}
      {error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{error}</p>}
    </div>
  )
}
