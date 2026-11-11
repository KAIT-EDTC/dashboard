import { ATTACHMENT_MAX_COUNT } from '@edtc/shared'
import { useEffect, useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { FileDropZone } from '~/components/ui/FileDropZone'
import { PaperclipIcon, XIcon } from '~/components/ui/Icons'
import { formatFileSize } from '~/lib/format'
import { AttachmentLink } from './AttachmentList'
import { ATTACHMENT_MAX_MB, pickUploadable } from './attachments'
import type { EventAttachment } from './types'

type Props = {
  /** 編集時の、すでに添付されているファイル */
  existing?: EventAttachment[]
  eventId?: string
}

const rowStyle = css({ display: 'flex', alignItems: 'center', gap: 'sm', py: 'xs' })

/**
 * 作成・編集フォームの添付欄。追加（ドラッグ＆ドロップか「＋」）と削除は保存するまで反映されず、
 * 保存時に `files`（追加）と `removeAttachmentIds`（削除）としてフォームと一緒に送られる
 */
export function AttachmentField({ existing = [], eventId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<File[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [error, setError] = useState<string>()

  // 選んだファイルを、フォーム送信に載せる隠し input へ反映する
  useEffect(() => {
    if (!inputRef.current) return
    const transfer = new DataTransfer()
    for (const file of staged) transfer.items.add(file)
    inputRef.current.files = transfer.files
  }, [staged])

  const keptCount = existing.filter((a) => !removed.includes(a.id)).length
  const total = keptCount + staged.length
  const add = (files: File[]) => {
    const { accepted, error } = pickUploadable(files, total)
    setError(error)
    setStaged((prev) => [...prev, ...accepted])
  }
  const toggleRemoved = (id: string) => setRemoved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
      <span className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted' })}>添付ファイル</span>
      {error && <Alert>{error}</Alert>}

      {(existing.length > 0 || staged.length > 0) && (
        <ul>
          {existing.map((attachment) => {
            const willRemove = removed.includes(attachment.id)
            return (
              <li key={attachment.id} className={rowStyle}>
                <PaperclipIcon size={16} className={css({ color: 'fg.subtle', flexShrink: 0 })} />
                <span className={css({ flex: 1, minW: 0, opacity: willRemove ? 0.5 : 1, textDecoration: willRemove ? 'line-through' : 'none' })}>
                  {eventId ? <AttachmentLink attachment={attachment} eventId={eventId} /> : attachment.name}
                  <span className={css({ ml: 'sm', fontSize: 'xs', color: 'fg.muted' })}>{formatFileSize(attachment.size)}</span>
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => toggleRemoved(attachment.id)}>
                  {willRemove ? '取り消す' : '削除'}
                </Button>
              </li>
            )
          })}
          {staged.map((file, index) => (
            <li key={`${file.name}-${index}`} className={rowStyle}>
              <PaperclipIcon size={16} className={css({ color: 'accent', flexShrink: 0 })} />
              <span className={css({ flex: 1, minW: 0, fontSize: 'sm', wordBreak: 'break-all' })}>
                {file.name}
                <span className={css({ ml: 'sm', fontSize: 'xs', color: 'fg.muted' })}>{formatFileSize(file.size)}・保存時に追加</span>
              </span>
              <Button type="button" size="sm" variant="ghost" aria-label={`${file.name}を外す`} onClick={() => setStaged((prev) => prev.filter((_, i) => i !== index))}>
                <XIcon size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FileDropZone onFiles={add} disabled={total >= ATTACHMENT_MAX_COUNT}>
        {total >= ATTACHMENT_MAX_COUNT
          ? `添付できるのは${ATTACHMENT_MAX_COUNT}個までです`
          : `ドラッグ＆ドロップでも追加できます（1ファイル${ATTACHMENT_MAX_MB}MBまで、${ATTACHMENT_MAX_COUNT}個まで）`}
      </FileDropZone>

      <input ref={inputRef} type="file" name="files" multiple hidden />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removeAttachmentIds" value={id} />
      ))}
    </div>
  )
}
