import { EVENT_CATEGORY_LABELS, type EventCategory } from '@edtc/shared'
import type { Bindings } from '../../env'
import { EMBED_COLORS, notify } from '../../lib/discord'

type EventSummary = {
  id: string
  title: string
  category: EventCategory
  startsAt: string
  location: string
  rsvpDeadline: string | null
}

const formatDateTime = (value: string) => value.replace('T', ' ')

export function notifyEventCreated(env: Bindings, event: EventSummary, organizerName: string) {
  return notify(env, {
    content: '📅 新しいイベントが登録されました。出欠の回答をお願いします！',
    embeds: [
      {
        title: event.title,
        url: `${env.FRONTEND_URL}/events/${event.id}`,
        color: EMBED_COLORS.info,
        fields: [
          { name: '日時', value: formatDateTime(event.startsAt), inline: true },
          { name: '種類', value: EVENT_CATEGORY_LABELS[event.category], inline: true },
          ...(event.location ? [{ name: '場所', value: event.location, inline: true }] : []),
          ...(event.rsvpDeadline ? [{ name: '出欠締切', value: formatDateTime(event.rsvpDeadline), inline: true }] : []),
          { name: '主催', value: organizerName, inline: true },
        ],
      },
    ],
  })
}
