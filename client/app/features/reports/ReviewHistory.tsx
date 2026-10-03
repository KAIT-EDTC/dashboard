import { APPROVAL_STEP_LABELS, REPORT_FIELD_LABELS } from '@edtc/shared'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Badge } from '~/components/ui/Badge'
import { Card } from '~/components/ui/Card'
import { formatTimestamp, fullName } from '~/lib/format'
import { InlineCommentItem } from './InlineComment'
import type { ReportReview } from './types'

/** 承認・差し戻しの履歴（新しい順） */
export function ReviewHistory({ reviews }: { reviews: ReportReview[] }) {
  if (reviews.length === 0) return null
  return (
    <Card title="確認の履歴" padded={false}>
      <ol>
        {[...reviews].reverse().map((review) => (
          <li key={review.id} className={css({ display: 'flex', flexDirection: 'column', gap: 'sm', px: 'lg', py: 'md', borderTopWidth: '1px', _first: { borderTopWidth: '0' } })}>
            <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'sm', fontSize: 'sm' })}>
              {review.reviewer && <Avatar user={review.reviewer} size={22} />}
              <span className={css({ fontWeight: '600' })}>{review.reviewer ? fullName(review.reviewer) : '退会したメンバー'}</span>
              <Badge>{APPROVAL_STEP_LABELS[review.step]}</Badge>
              {review.decision === 'approve' ? <Badge tone="success">承認</Badge> : <Badge tone="danger">差し戻し</Badge>}
              <span className={css({ ml: 'auto', fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(review.createdAt)}</span>
            </div>
            {review.comment && <p className={css({ fontSize: 'sm', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })}>{review.comment}</p>}
            {review.comments.map((comment) => (
              <div key={comment.id} className={css({ display: 'flex', flexDirection: 'column', gap: '2px' })}>
                <span className={css({ fontSize: 'xs', fontWeight: '600', color: 'fg.subtle' })}>{REPORT_FIELD_LABELS[comment.field]}</span>
                <InlineCommentItem quote={comment.quote} body={comment.body} />
              </div>
            ))}
          </li>
        ))}
      </ol>
    </Card>
  )
}
