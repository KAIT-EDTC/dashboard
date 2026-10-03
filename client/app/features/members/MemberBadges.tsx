import { OFFICER_LABELS, type Division, type Officer } from '@edtc/shared'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'

type BadgeMember = { grade: number; divisions: Division[]; role: 'member' | 'admin'; headOf?: Division[]; officer?: Officer | null }

export function MemberBadges({ member }: { member: BadgeMember }) {
  return (
    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '4px' })}>
      <Badge tone="success">{member.grade}年</Badge>
      {member.divisions.map((division) => (
        <Badge key={division} tone="accent">
          {division}
        </Badge>
      ))}
      {member.officer && <Badge tone="warning">{OFFICER_LABELS[member.officer]}</Badge>}
      {member.headOf?.map((division) => (
        <Badge key={`head-${division}`} tone="warning">
          {division}長
        </Badge>
      ))}
      {member.role === 'admin' && <Badge tone="discord">管理者</Badge>}
    </div>
  )
}
