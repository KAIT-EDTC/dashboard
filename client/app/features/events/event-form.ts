import { eventInputSchema } from '@edtc/shared'
import { optionalInt, optionalText, text, texts } from '~/lib/form'

export function parseEventForm(form: FormData) {
  return eventInputSchema.safeParse({
    title: text(form, 'title'),
    category: text(form, 'category'),
    description: text(form, 'description'),
    location: text(form, 'location'),
    startsAt: text(form, 'startsAt'),
    endsAt: optionalText(form, 'endsAt'),
    rsvpDeadline: optionalText(form, 'rsvpDeadline'),
    capacity: optionalInt(form, 'capacity'),
    fee: optionalInt(form, 'fee'),
    targetDivisions: texts(form, 'targetDivisions'),
    targetUserIds: texts(form, 'targetUserIds'),
    // シフトなしのときは時間帯を保存しない
    ...(text(form, 'hasShifts') === 'true'
      ? {
          hasShifts: true,
          shiftStartHour: optionalInt(form, 'shiftStartHour'),
          shiftEndHour: optionalInt(form, 'shiftEndHour'),
          shiftSplitHour: optionalInt(form, 'shiftSplitHour'),
        }
      : { hasShifts: false, shiftStartHour: null, shiftEndHour: null, shiftSplitHour: null }),
  })
}
