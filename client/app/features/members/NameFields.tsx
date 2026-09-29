import { css } from 'styled-system/css'
import { TextField } from '~/components/ui/Field'

type Names = { lastName: string; firstName: string; lastNameKana: string; firstNameKana: string }

/** 氏名とフリガナ（登録・プロフィール編集で共通） */
export function NameFields({ defaultValue, errors = {} }: { defaultValue?: Partial<Names>; errors?: Record<string, string> }) {
  const grid = css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'md' })
  return (
    <>
      <div className={grid}>
        <TextField label="姓" name="lastName" required placeholder="山田" defaultValue={defaultValue?.lastName} error={errors.lastName} />
        <TextField label="名" name="firstName" required placeholder="太郎" defaultValue={defaultValue?.firstName} error={errors.firstName} />
      </div>
      <div className={grid}>
        <TextField label="姓（フリガナ）" name="lastNameKana" required placeholder="ヤマダ" defaultValue={defaultValue?.lastNameKana} error={errors.lastNameKana} />
        <TextField label="名（フリガナ）" name="firstNameKana" required placeholder="タロウ" defaultValue={defaultValue?.firstNameKana} error={errors.firstNameKana} />
      </div>
    </>
  )
}
