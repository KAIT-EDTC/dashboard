import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Card } from '~/components/ui/Card'
import { EmptyState } from '~/components/ui/EmptyState'
import { PenIcon } from '~/components/ui/Icons'
import { formatTimestamp } from '~/lib/format'
import { PostStatusBadge } from './PostStatusBadge'
import type { PostListItem } from './types'

/** ホーム用: 書きかけ・レビュー中の自分の記事 */
export function MyPostsCard({ posts }: { posts: PostListItem[] }) {
  const active = posts.filter((post) => post.status !== 'published').slice(0, 5)
  return (
    <Card title="書きかけの記事" action={<Link to="/blog?scope=mine" className={css({ fontSize: 'sm' })}>すべて見る</Link>} padded={false}>
      {active.length === 0 ? (
        <EmptyState icon={<PenIcon size={28} />} title="書きかけの記事はありません" />
      ) : (
        <ul>
          {active.map((post) => (
            <li key={post.id}>
              <Link
                to={`/blog/${post.id}`}
                className={css({ display: 'flex', alignItems: 'center', gap: 'sm', px: 'lg', py: '12px', color: 'fg', borderTopWidth: '1px', _hover: { bg: 'surface.subtle', color: 'fg' } })}
              >
                <PostStatusBadge status={post.status} />
                <span className={css({ flex: 1, fontWeight: '500', truncate: true })}>{post.title || '無題の記事'}</span>
                <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatTimestamp(post.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
