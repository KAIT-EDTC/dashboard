import type { InferResponseType } from 'hono/client'
import { Form } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Avatar } from '~/components/ui/Avatar'
import { Button } from '~/components/ui/Button'
import type { api } from '~/lib/api'
import type { FormErrors } from '~/lib/form'
import { DivisionPicker } from '../members/DivisionPicker'
import { NameFields } from '../members/NameFields'

export type RegistrationInfo = InferResponseType<typeof api.auth.registration.$get, 200>

const sectionTitle = css({ fontSize: 'xs', fontWeight: '700', color: 'accent', letterSpacing: '0.08em', mb: 'sm' })

export function RegisterForm({ info, errors, submitting }: { info: RegistrationInfo; errors?: FormErrors; submitting: boolean }) {
  const { student } = info
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      <div className={css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'sm', textAlign: 'center' })}>
        <Avatar user={info} size={72} />
        <p className={css({ fontWeight: '600' })}>@{info.discordUsername}</p>
        <h1 className={css({ fontSize: '2xl', fontWeight: '700' })}>プロフィール登録</h1>
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          EDTCへようこそ！Discordのサーバーニックネームから学籍情報を読み取りました。
        </p>
      </div>

      {student ? (
        <section>
          <h2 className={sectionTitle}>学籍情報（自動取得）</h2>
          <dl className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'md', p: 'md', bg: 'surface.muted', borderRadius: 'md', '& dt': { fontSize: 'xs', color: 'fg.subtle', fontWeight: '600' }, '& dd': { fontWeight: '600' } })}>
            <div><dt>学籍番号</dt><dd>{student.studentId}</dd></div>
            <div><dt>学年</dt><dd>{student.grade}年</dd></div>
            <div><dt>学部</dt><dd>{student.faculty}</dd></div>
            <div><dt>学科</dt><dd>{student.department}</dd></div>
          </dl>
        </section>
      ) : (
        <Alert tone="warning">
          Discordのサーバーニックネーム（現在: {info.nickname ?? '未設定'}）から学籍番号を読み取れませんでした。
          {'\n'}ニックネームを「2424013: 山田 太郎」の形式に変更してから、もう一度ログインしてください。
        </Alert>
      )}

      <Form method="post" className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
        <h2 className={sectionTitle}>基本情報</h2>
        {errors?.error && <Alert>{errors.error}</Alert>}
        <NameFields defaultValue={info.suggestedName ?? undefined} errors={errors?.fieldErrors} />
        <DivisionPicker error={errors?.fieldErrors?.divisions} />
        <Button type="submit" variant="primary" size="lg" block loading={submitting} disabled={!student}>
          この内容で登録する
        </Button>
      </Form>
    </div>
  )
}
