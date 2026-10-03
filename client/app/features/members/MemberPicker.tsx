import { useState, type ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { Button } from '~/components/ui/Button'
import { SelectField } from '~/components/ui/Field'
import { XIcon } from '~/components/ui/Icons'
import { fullName } from '~/lib/format'

type PickableMember = { id: string; discordUsername: string; discordAvatar: string | null; lastName: string; firstName: string }

type Props = {
  members: PickableMember[]
  /** 選ばれているメンバーのID（選んだ順） */
  value: string[]
  onChange: (userIds: string[]) => void
  label: ReactNode
  disabled?: boolean
}

/** メンバーの複数選択。ドロップダウンで選んで追加し、チップの×で外す */
export function MemberPicker({ members, value, onChange, label, disabled }: Props) {
  const [picked, setPicked] = useState('')
  const selected = value.flatMap((id) => members.find((m) => m.id === id) ?? [])
  const candidates = members.filter((m) => !value.includes(m.id))

  const add = () => {
    if (!picked) return
    onChange([...value, picked])
    setPicked('')
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
      {selected.length > 0 && (
        <ul className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
          {selected.map((member) => (
            <li
              key={member.id}
              className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs', py: '2px', pl: 'xs', pr: '2px', borderRadius: 'full', borderWidth: '1px', borderColor: 'border', bg: 'surface' })}
            >
              <Avatar user={member} size={22} />
              <span className={css({ fontSize: 'sm', fontWeight: '500' })}>{fullName(member)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((id) => id !== member.id))}
                aria-label={`${fullName(member)}を外す`}
                className={css({ display: 'inline-flex', p: 'xs', borderRadius: 'full', color: 'fg.subtle', cursor: 'pointer', _hover: { color: 'fg', bg: 'surface.hover' }, _disabled: { opacity: 0.6, cursor: 'not-allowed' } })}
              >
                <XIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={css({ display: 'flex', alignItems: 'flex-end', gap: 'sm' })}>
        <SelectField
          label={label}
          value={picked}
          onChange={(e) => setPicked(e.currentTarget.value)}
          disabled={disabled || candidates.length === 0}
          className={css({ flex: 1 })}
        >
          <option value="">メンバーを選択…</option>
          {candidates.map((member) => (
            <option key={member.id} value={member.id}>
              {fullName(member)}（@{member.discordUsername}）
            </option>
          ))}
        </SelectField>
        <Button variant="secondary" disabled={disabled || !picked} onClick={add}>
          追加
        </Button>
      </div>
    </div>
  )
}
