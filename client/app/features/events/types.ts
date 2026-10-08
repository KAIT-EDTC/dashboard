import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

export type EventListItem = InferResponseType<typeof api.events.$get, 200>['events'][number]
export type EventDetailResponse = InferResponseType<(typeof api.events)[':id']['$get'], 200>
export type EventDetail = EventDetailResponse['event']
export type EventParticipant = EventDetail['participants'][number]
export type EventItem = EventDetail['items'][number]
export type PendingMember = EventDetailResponse['pending'][number]
export type MyItem = InferResponseType<(typeof api.events)['my-items']['$get'], 200>['items'][number]
export type EventReport = EventDetailResponse['reports'][number]
