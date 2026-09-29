import { zValidator as baseValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

/** バリデーションエラーを { error, fieldErrors } 形式の400で返す */
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) =>
  baseValidator(target, schema, (result, c) => {
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path.join('.')
        fieldErrors[key] ??= issue.message
      }
      return c.json({ error: result.error.issues[0]?.message ?? '入力内容が正しくありません', fieldErrors }, 400)
    }
  })
