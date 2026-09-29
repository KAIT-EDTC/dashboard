import type { InferResponseType } from 'hono/client'
import type { api } from '~/lib/api'

export type PostListItem = InferResponseType<typeof api.blog.posts.$get, 200>['posts'][number]
export type PostDetailResponse = InferResponseType<(typeof api.blog.posts)[':id']['$get'], 200>
export type PostDetail = PostDetailResponse['post']
