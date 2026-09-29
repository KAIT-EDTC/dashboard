import { profileSchema } from '@edtc/shared'
import { text, texts } from '~/lib/form'

/** 「電子工作、Rust, 旅行」のような入力を配列にする */
export function splitInterests(value: string): string[] {
  return [...new Set(value.split(/[,、，\n]+/).map((s) => s.trim()).filter(Boolean))]
}

export function parseProfileForm(form: FormData) {
  return profileSchema.safeParse({
    lastName: text(form, 'lastName'),
    firstName: text(form, 'firstName'),
    lastNameKana: text(form, 'lastNameKana'),
    firstNameKana: text(form, 'firstNameKana'),
    divisions: texts(form, 'divisions'),
    nickname: text(form, 'nickname'),
    headline: text(form, 'headline'),
    bio: text(form, 'bio'),
    interests: splitInterests(text(form, 'interests')),
    links: {
      github: text(form, 'links.github'),
      x: text(form, 'links.x'),
      instagram: text(form, 'links.instagram'),
      website: text(form, 'links.website'),
    },
  })
}
