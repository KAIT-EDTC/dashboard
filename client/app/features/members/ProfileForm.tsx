import { Form } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button, ButtonLink } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { TextareaField, TextField } from '~/components/ui/Field'
import type { CurrentUser } from '../auth/use-current-user'
import type { FormErrors } from '~/lib/form'
import { DivisionPicker } from './DivisionPicker'
import { NameFields } from './NameFields'

export function ProfileForm({ user, errors, submitting }: { user: CurrentUser; errors?: FormErrors; submitting: boolean }) {
  const fieldErrors = errors?.fieldErrors ?? {}
  const stack = css({ display: 'flex', flexDirection: 'column', gap: 'md' })
  return (
    <Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'lg', maxW: '760px' })}>
      {errors?.error && <Alert>{errors.error}</Alert>}

      <Card title="自己紹介（メンバーに公開されます）">
        <div className={stack}>
          <TextField label="呼び名" name="nickname" defaultValue={user.nickname} placeholder="例: たろう" error={fieldErrors.nickname} hint="メンバー一覧で名前の横に表示されます" />
          <TextField label="ひとこと" name="headline" defaultValue={user.headline} placeholder="例: ロボットと電子工作が好きです" error={fieldErrors.headline} />
          <TextareaField label="自己紹介" name="bio" rows={6} defaultValue={user.bio} error={fieldErrors.bio} placeholder="活動で頑張りたいこと、得意なこと、最近ハマっていることなど" />
          <TextField
            label="興味・趣味"
            name="interests"
            defaultValue={user.interests.join('、')}
            placeholder="電子工作、プログラミング、写真"
            hint="「、」または「,」で区切って入力"
            error={fieldErrors.interests}
          />
        </div>
      </Card>

      <Card title="リンク">
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: 'md' })}>
          <TextField label="GitHub ユーザー名" name="links.github" defaultValue={user.links.github} placeholder="octocat" error={fieldErrors['links.github']} />
          <TextField label="X ユーザー名" name="links.x" defaultValue={user.links.x} placeholder="edtc_kait" error={fieldErrors['links.x']} />
          <TextField label="Instagram ユーザー名" name="links.instagram" defaultValue={user.links.instagram} error={fieldErrors['links.instagram']} />
          <TextField label="Webサイト" name="links.website" type="url" defaultValue={user.links.website} placeholder="https://" error={fieldErrors['links.website']} />
        </div>
      </Card>

      <Card title="基本情報">
        <div className={stack}>
          <NameFields defaultValue={user} errors={fieldErrors} />
          <DivisionPicker defaultValue={user.divisions} error={fieldErrors.divisions} />
          <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>
            学籍番号 {user.studentId}（{user.faculty} {user.department}）は登録時にDiscordのニックネームから取得しています。
          </p>
        </div>
      </Card>

      <div className={css({ display: 'flex', gap: 'sm', justifyContent: 'flex-end' })}>
        <ButtonLink to={`/members/${user.id}`} variant="ghost">
          キャンセル
        </ButtonLink>
        <Button type="submit" variant="primary" loading={submitting}>
          保存する
        </Button>
      </div>
    </Form>
  )
}
