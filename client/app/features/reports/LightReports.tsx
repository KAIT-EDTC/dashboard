import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { TextareaField } from '~/components/ui/Field'
import { EditIcon, MessageIcon, SendIcon, TrashIcon } from '~/components/ui/Icons'
import type { EventLightReport } from '~/features/events/types'
import type { FormErrors } from '~/lib/form'
import { formatTimestamp, fullName } from '~/lib/format'

type Result = FormErrors | { ok: true }

/** 自分の簡易報告書を書く・直すフォーム。文字数の上限はなく、保存するとすぐにイベントページへ載る */
function LightReportForm({ initial, onDone, onCancel }: { initial?: string; onDone?: () => void; onCancel?: () => void }) {
  const fetcher = useFetcher<Result>()
  const [body, setBody] = useState(initial ?? '')
  const saving = fetcher.state !== 'idle'
  const error = fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : undefined
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data) onDone?.()
  }, [fetcher.state, fetcher.data, onDone])

  return (
    <fetcher.Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      <input type="hidden" name="intent" value="light-report" />
      <TextareaField
        label="事後報告"
        name="body"
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        rows={5}
        placeholder="やったこと、気づいたこと、次に活かしたいことなど"
        hint={initial === undefined ? '文字数の制限はありません。承認はなく、投稿するとすぐにこのページに名前付きで載ります（あとから直す・消すこともできます）。' : undefined}
        error={error}
      />
      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            キャンセル
          </Button>
        )}
        <Button type="submit" variant="primary" loading={saving} disabled={!body.trim()}>
          <SendIcon size={16} />
          {initial === undefined ? '投稿する' : '保存する'}
        </Button>
      </div>
    </fetcher.Form>
  )
}

/** 1人分の簡易報告書。本人は直せる（書けるあいだだけ）・消せる（いつでも） */
function LightReportItem({ report, own, canEdit }: { report: EventLightReport; own: boolean; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const deleter = useFetcher<Result>()
  const deleteError = deleter.state === 'idle' && deleter.data && 'error' in deleter.data ? deleter.data.error : undefined

  return (
    <li className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', px: 'lg', py: '12px', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm' })}>
        <Avatar user={report.user} size={24} />
        <span className={css({ fontSize: 'sm', fontWeight: '600' })}>
          {fullName(report.user)}
          {own && <span className={css({ fontWeight: '400', color: 'fg.muted' })}>（あなた）</span>}
        </span>
        <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>
          {formatTimestamp(report.updatedAt)}
          {report.updatedAt !== report.createdAt && '（編集済み）'}
        </span>
        {own && !editing && (
          <span className={css({ display: 'inline-flex', gap: 'xs', ml: 'auto' })}>
            {canEdit && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <EditIcon size={14} />
                編集
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              loading={deleter.state !== 'idle'}
              onClick={() => confirm('自分の簡易報告書を削除しますか？') && deleter.submit({ intent: 'delete-light-report' }, { method: 'post' })}
            >
              <TrashIcon size={14} />
              削除
            </Button>
          </span>
        )}
      </div>
      {deleteError && <p className={css({ fontSize: 'xs', color: 'danger.fg' })}>{deleteError}</p>}
      {editing ? (
        <LightReportForm initial={report.body} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      ) : (
        <p className={css({ fontSize: 'sm', lineHeight: '1.8', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{report.body}</p>
      )}
    </li>
  )
}

/** イベント詳細: 簡易報告書（事後報告だけ・承認なし）。書いた人の名前付きで、メンバー全員に見せる */
export function LightReports({ reports, userId, canWrite }: { reports: EventLightReport[]; userId: string; canWrite: boolean }) {
  const written = reports.some((report) => report.userId === userId)
  return (
    <Card title={`簡易報告書（${reports.length}）`} padded={false}>
      {canWrite && !written && (
        <div className={css({ p: 'lg', borderBottomWidth: reports.length > 0 ? '1px' : '0' })}>
          <LightReportForm />
        </div>
      )}
      {reports.length > 0 ? (
        <ul>
          {reports.map((report) => (
            <LightReportItem key={report.userId} report={report} own={report.userId === userId} canEdit={canWrite} />
          ))}
        </ul>
      ) : (
        !canWrite && <EmptyState icon={<MessageIcon size={28} />} title="簡易報告書はまだありません" />
      )}
    </Card>
  )
}
