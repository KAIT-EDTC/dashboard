import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

export type MemberListItem = InferResponseType<typeof api.members.$get, 200>['members'][number]
export type MemberProfile = InferResponseType<(typeof api.members)[':id']['$get'], 200>
