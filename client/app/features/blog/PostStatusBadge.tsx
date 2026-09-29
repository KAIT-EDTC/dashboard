import { BLOG_STATUS_LABELS, type BlogStatus } from '@edtc/shared'
import { Badge, type BadgeTone } from '~/components/ui/Badge'

const TONES: Record<BlogStatus, BadgeTone> = { draft: 'neutral', in_review: 'warning', published: 'success' }

export function PostStatusBadge({ status }: { status: BlogStatus }) {
  return <Badge tone={TONES[status]}>{BLOG_STATUS_LABELS[status]}</Badge>
}
