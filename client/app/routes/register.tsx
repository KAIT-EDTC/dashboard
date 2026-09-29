import { registrationSchema } from '@edtc/shared'
import { redirect, useNavigation } from 'react-router'
import { PublicShell } from '~/components/layout/PublicShell'
import { RegisterForm } from '~/features/auth/RegisterForm'
import { api, unwrap } from '~/lib/api'
import { catchApiError, text, texts, zodErrors } from '~/lib/form'
import type { Route } from './+types/register'

export const meta: Route.MetaFunction = () => [{ title: 'プロフィール登録 | EDTC ダッシュボード' }]

export async function clientLoader() {
  const res = await api.auth.registration.$get()
  if (res.status === 401) throw redirect('/login?error=registration_expired')
  return { info: await unwrap(Promise.resolve(res)) }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData()
  const parsed = registrationSchema.safeParse({
    lastName: text(form, 'lastName'),
    firstName: text(form, 'firstName'),
    lastNameKana: text(form, 'lastNameKana'),
    firstNameKana: text(form, 'firstNameKana'),
    divisions: texts(form, 'divisions'),
  })
  if (!parsed.success) return zodErrors(parsed.error)

  const result = await catchApiError(() => unwrap(api.auth.registration.$post({ json: parsed.data })))
  if (result.errors) return result.errors
  return redirect('/')
}

export default function RegisterPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation()
  return (
    <PublicShell>
      <RegisterForm info={loaderData.info} errors={actionData} submitting={navigation.state === 'submitting'} />
    </PublicShell>
  )
}
