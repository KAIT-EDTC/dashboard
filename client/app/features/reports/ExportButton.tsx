import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { DownloadIcon } from '~/components/ui/Icons'
import { ApiError } from '~/lib/api'
import { exportReports } from './export'

type Props = {
  /** 何も指定しなければ承認済みの全件 */
  eventId?: string
  reportId?: string
  /** 複数のときにまとめる .zip の名前 */
  zipName?: string
  size?: 'sm' | 'md'
}

/** 承認済みの活動報告書・まとめ報告書を、それぞれの様式（Excel）で書き出すボタン */
export function ExportButton({ eventId, reportId, zipName = '活動報告書.zip', size }: Props) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const count = await exportReports({ ...(eventId && { eventId }), ...(reportId && { reportId }) }, zipName)
      if (count === 0) alert('承認済みの報告書はまだありません')
    } catch (error) {
      alert(error instanceof ApiError ? error.message : '書き出せませんでした')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button size={size} onClick={run} loading={busy}>
      <DownloadIcon size={size === 'sm' ? 14 : 16} />
      Excelで書き出す
    </Button>
  )
}
