import { z } from 'zod'
import { DIVISIONS } from '../divisions'

const name = (label: string) =>
  z.string().trim().min(1, `${label}を入力してください`).max(50, `${label}が長すぎます`)

const kana = (label: string) =>
  name(label).regex(/^[ァ-ヶー・\s　]+$/u, `${label}はカタカナで入力してください`)

const handle = z
  .string()
  .trim()
  .regex(/^@?[A-Za-z0-9_.-]{0,39}$/, 'ユーザー名の形式が正しくありません')
  .transform((v) => v.replace(/^@/, ''))

export const registrationSchema = z.object({
  lastName: name('姓'),
  firstName: name('名'),
  lastNameKana: kana('姓（フリガナ）'),
  firstNameKana: kana('名（フリガナ）'),
  divisions: z.array(z.enum(DIVISIONS)).min(1, '所属部署を1つ以上選んでください'),
})
export type RegistrationInput = z.input<typeof registrationSchema>

export const LINK_KEYS = ['github', 'x', 'instagram', 'website'] as const
export type LinkKey = (typeof LINK_KEYS)[number]
export type ProfileLinks = Partial<Record<LinkKey, string>>

export const profileSchema = registrationSchema.extend({
  nickname: z.string().trim().max(30, '呼び名は30文字以内にしてください'),
  headline: z.string().trim().max(80, 'ひとことは80文字以内にしてください'),
  bio: z.string().trim().max(2000, '自己紹介は2000文字以内にしてください'),
  interests: z.array(z.string().trim().min(1).max(30)).max(15, '興味・趣味は15個までです'),
  links: z.object({
    github: handle,
    x: handle,
    instagram: handle,
    website: z.union([z.literal(''), z.url('URLの形式が正しくありません')]),
  }),
})
export type ProfileInput = z.input<typeof profileSchema>
