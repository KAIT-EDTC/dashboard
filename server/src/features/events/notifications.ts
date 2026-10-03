import type { Db } from '../../db'
import type { Bindings } from '../../env'
import { EMBED_COLORS, mention, notify } from '../../lib/discord'

type EventSummary = {
  id: string
  title: string
  /** 種類の表示名 */
  categoryLabel: string
  startsAt: string
  location: string
  rsvpDeadline: string | null
}

const formatDateTime = (value: string) => value.replace('T', ' ')

/** target.label が null なら全員向け（メンションしない） */
export function notifyEventCreated(
  env: Bindings,
  db: Db,
  event: EventSummary,
  organizerName: string,
  target: { label: string | null; mentionIds: string[] },
) {
  return notify(env, db, 'eventCreated', {
    content: [
      target.mentionIds.map(mention).join(' '),
      target.label ? `📅 ${target.label}向けのイベントが登録されました。出欠の回答をお願いします！` : '📅 新しいイベントが登録されました。出欠の回答をお願いします！',
    ]
      .filter(Boolean)
      .join(' '),
    mentionUserIds: target.mentionIds,
    embeds: [
      {
        title: event.title,
        url: `${env.FRONTEND_URL}/events/${event.id}`,
        color: EMBED_COLORS.info,
        fields: [
          { name: '日時', value: formatDateTime(event.startsAt), inline: true },
          { name: '種類', value: event.categoryLabel, inline: true },
          ...(event.location ? [{ name: '場所', value: event.location, inline: true }] : []),
          ...(event.rsvpDeadline ? [{ name: '出欠締切', value: formatDateTime(event.rsvpDeadline), inline: true }] : []),
          { name: '主催', value: organizerName, inline: true },
          ...(target.label ? [{ name: '対象', value: target.label, inline: true }] : []),
        ],
      },
    ],
  })
}
