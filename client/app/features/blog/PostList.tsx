import { Link } from 'react-router'
import { css } from 'styled-system/css'
import { Avatar } from '~/components/ui/Avatar'
import { ImageIcon } from '~/components/ui/Icons'
import { formatDate, formatTimestamp, fullName } from '~/lib/format'
import { blogImageUrl } from './image'
import { PostStatusBadge } from './PostStatusBadge'
import type { PostListItem } from './types'

export function PostList({ posts }: { posts: PostListItem[] }) {
  return (
    <ul className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'md' })}>
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            to={`/blog/${post.id}`}
            className={css({
              display: 'flex',
              flexDirection: 'column',
              h: 'full',
              color: 'fg',
              bg: 'surface',
              borderWidth: '1px',
              borderColor: 'border',
              borderRadius: 'lg',
              overflow: 'hidden',
              _hover: { color: 'fg', borderColor: 'border.strong', shadow: 'card' },
            })}
          >
            <div className={css({ aspectRatio: '16 / 9', bg: 'surface.muted', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'fg.subtle' })}>
              {post.thumbnail ? (
                <img src={blogImageUrl(post.id, post.thumbnail)} alt="" loading="lazy" className={css({ w: 'full', h: 'full', objectFit: 'cover' })} />
              ) : (
                <ImageIcon size={28} />
              )}
            </div>
            <div className={css({ flex: 1, display: 'flex', flexDirection: 'column', gap: 'xs', p: 'md' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: 'xs' })}>
                <PostStatusBadge status={post.status} />
                {post.eventDate && <span className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{formatDate(post.eventDate, { withYear: true })}</span>}
              </div>
              <p className={css({ fontWeight: '600', lineClamp: 2 })}>{post.title || '無題の記事'}</p>
              <div className={css({ mt: 'auto', display: 'flex', alignItems: 'center', gap: 'xs', fontSize: 'xs', color: 'fg.muted' })}>
                <Avatar user={post.author} size={20} />
                <span className={css({ flex: 1, truncate: true })}>{fullName(post.author)}</span>
                <span>{formatTimestamp(post.updatedAt)}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
