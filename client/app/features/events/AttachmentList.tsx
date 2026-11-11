import { ATTACHMENT_MAX_COUNT } from '@edtc/shared'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { FileDropZone } from '~/components/ui/FileDropZone'
import { PaperclipIcon, TrashIcon } from '~/components/ui/Icons'
import { API_URL } from '~/lib/api'
import type { FormErrors } from '~/lib/form'
import { formatFileSize } from '~/lib/format'
import { ATTACHMENT_MAX_MB, pickUploadable } from './attachments'
import type { EventAttachment, EventDetail } from './types'

export function AttachmentLink({ attachment, eventId }: { attachment: EventAttachment; eventId: string }) {
  return (
    <a
      href={`${API_URL}/api/events/${eventId}/attachments/${attachment.id}`}
      className={css({ fontSize: 'sm', fontWeight: '600', color: 'accent', wordBreak: 'break-all', _hover: { textDecoration: 'underline' } })}
    >
      {attachment.name}
    </a>
  )
}

function AttachmentRow({ attachment, eventId, canManage }: { attachment: EventAttachment; eventId: string; canManage: boolean }) {
  const fetcher = useFetcher<FormErrors>()

  return (
    <li className={css({ display: 'flex', alignItems: 'center', gap: 'sm', py: 'xs' })}>
      <PaperclipIcon size={16} className={css({ color: 'fg.subtle', flexShrink: 0 })} />
      <div className={css({ flex: 1, minW: 0 })}>
        <AttachmentLink attachment={attachment} eventId={eventId} />
        <span className={css({ ml: 'sm', fontSize: 'xs', color: 'fg.muted' })}>{formatFileSize(attachment.size)}</span>
        {fetcher.data?.error && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{fetcher.data.error}</p>}
      </div>
      {canManage && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${attachment.name}を削除`}
          loading={fetcher.state !== 'idle'}
          onClick={() => fetcher.submit({ intent: 'delete-attachment', attachmentId: attachment.id }, { method: 'post' })}
        >
          <TrashIcon size={14} />
        </Button>
      )}
    </li>
  )
}

/** 詳細ページで管理側がファイルを足す欄。選んだ（ドロップした）ファイルはその場でアップロードする */
function UploadZone({ count }: { count: number }) {
  const fetcher = useFetcher<FormErrors | { ok: true }>()
  const [pickError, setPickError] = useState<string>()
  const busy = fetcher.state !== 'idle'
  const full = count >= ATTACHMENT_MAX_COUNT
  const error = pickError ?? (fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined)

  const upload = (files: File[]) => {
    const { accepted, error } = pickUploadable(files, count)
    setPickError(error)
    if (accepted.length === 0) return
    const body = new FormData()
    body.append('intent', 'upload-attachment')
    for (const file of accepted) body.append('file', file)
    fetcher.submit(body, { method: 'post', encType: 'multipart/form-data' })
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'xs', mt: 'sm' })}>
      {error && <Alert>{error}</Alert>}
      <FileDropZone onFiles={upload} disabled={full || busy} loading={busy}>
        {full ? `添付できるのは${ATTACHMENT_MAX_COUNT}個までです` : `ドラッグ＆ドロップでも追加できます（1ファイル${ATTACHMENT_MAX_MB}MBまで、${ATTACHMENT_MAX_COUNT}個まで）`}
      </FileDropZone>
    </div>
  )
}

/** 詳細ページの「概要」に置く添付ファイルの一覧。閲覧だけの人には、添付が無ければ何も出さない */
export function AttachmentList({ event, canManage }: { event: EventDetail; canManage: boolean }) {
  if (event.attachments.length === 0 && !canManage) return null

  return (
    <section className={css({ mt: 'lg' })}>
      <h3 className={css({ fontSize: 'xs', fontWeight: '700', color: 'fg.subtle', mb: 'xs' })}>添付ファイル</h3>
      {event.attachments.length > 0 && (
        <ul>
          {event.attachments.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} eventId={event.id} canManage={canManage} />
          ))}
        </ul>
      )}
      {canManage && <UploadZone count={event.attachments.length} />}
    </section>
  )
}
