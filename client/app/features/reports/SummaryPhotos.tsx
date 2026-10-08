import { SUMMARY_LIMITS } from '@edtc/shared'
import { useRef, useState } from 'react'
import { useRevalidator } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { ImageIcon, TrashIcon } from '~/components/ui/Icons'
import { deleteSummaryPhoto, summaryPhotoUrl, uploadSummaryPhoto } from './photo'

const gridStyle = css({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'sm' })
const photoStyle = css({ w: 'full', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 'md', bg: 'surface.muted' })

type Props = {
  /** まだ作られていない（作成ページ）なら null */
  reportId: string | null
  photos: string[]
  /** 追加・削除できるか（下書き・修正依頼の間の担当者） */
  editable: boolean
}

/** まとめ報告書の活動写真（Excelの「図1. 活動写真」の枠に横一列で貼られる） */
export function SummaryPhotos({ reportId, photos, editable }: Props) {
  const revalidator = useRevalidator()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const full = photos.length >= SUMMARY_LIMITS.photos.max

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await task()
      await revalidator.revalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : '写真を保存できませんでした')
    } finally {
      setBusy(false)
    }
  }

  if (!editable && photos.length === 0) return null

  return (
    <Card
      title={`活動写真（${photos.length} / ${SUMMARY_LIMITS.photos.max}）`}
      action={
        editable &&
        reportId && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className={css({ srOnly: true })}
              onChange={(e) => {
                const files = [...(e.currentTarget.files ?? [])].slice(0, SUMMARY_LIMITS.photos.max - photos.length)
                e.currentTarget.value = ''
                if (files.length > 0) void run(async () => {
                  for (const file of files) await uploadSummaryPhoto(reportId, file)
                })
              }}
            />
            <Button size="sm" loading={busy} disabled={full} onClick={() => input.current?.click()}>
              <ImageIcon size={14} />
              写真を追加
            </Button>
          </>
        )
      }
    >
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
        {error && <Alert>{error}</Alert>}
        {!reportId ? (
          <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>下書きを保存すると追加できます</p>
        ) : photos.length === 0 ? (
          <p className={css({ fontSize: 'sm', color: 'fg.subtle' })}>SNS使用許可の出ている写真だけを追加してください</p>
        ) : (
          <ul className={gridStyle}>
            {photos.map((fileName) => (
              <li key={fileName} className={css({ position: 'relative' })}>
                <img src={summaryPhotoUrl(reportId, fileName)} alt="" className={photoStyle} />
                {editable && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => confirm('この写真を削除しますか？') && void run(() => deleteSummaryPhoto(reportId, fileName))}
                    className={css({ position: 'absolute', top: 'xs', right: 'xs', px: '6px' })}
                    aria-label="写真を削除"
                  >
                    <TrashIcon size={14} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
