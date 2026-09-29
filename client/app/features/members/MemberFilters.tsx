import { DIVISIONS } from '@edtc/shared'
import { Form, useSubmit } from 'react-router'
import { css } from 'styled-system/css'
import { inputStyle } from '~/components/ui/Field'

export type MemberFilter = { q: string; division: string; grade: string }

export function MemberFilters({ filter, grades }: { filter: MemberFilter; grades: number[] }) {
  const submit = useSubmit()
  return (
    <Form
      role="search"
      onChange={(e) => submit(e.currentTarget, { replace: true, preventScrollReset: true })}
      className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '2fr 1fr 1fr' }, gap: 'sm', mb: 'lg' })}
    >
      <input
        type="search"
        name="q"
        defaultValue={filter.q}
        placeholder="名前・フリガナ・趣味で検索"
        aria-label="検索"
        className={inputStyle}
      />
      <select name="division" defaultValue={filter.division} aria-label="部署" className={inputStyle}>
        <option value="">すべての部署</option>
        {DIVISIONS.map((division) => (
          <option key={division} value={division}>
            {division}
          </option>
        ))}
      </select>
      <select name="grade" defaultValue={filter.grade} aria-label="学年" className={inputStyle}>
        <option value="">すべての学年</option>
        {grades.map((grade) => (
          <option key={grade} value={grade}>
            {grade}年
          </option>
        ))}
      </select>
    </Form>
  )
}

export function filterMembers<T extends { lastName: string; firstName: string; lastNameKana: string; firstNameKana: string; nickname: string; interests: string[]; divisions: string[]; grade: number }>(
  members: T[],
  filter: MemberFilter,
): T[] {
  const q = filter.q.trim().toLowerCase()
  return members.filter((m) => {
    if (filter.division && !m.divisions.includes(filter.division)) return false
    if (filter.grade && m.grade !== Number(filter.grade)) return false
    if (!q) return true
    const haystack = [m.lastName + m.firstName, m.lastNameKana + m.firstNameKana, m.nickname, ...m.interests].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}
