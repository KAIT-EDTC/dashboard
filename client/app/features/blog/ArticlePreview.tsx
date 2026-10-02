import { articleIdBase, type BlogPostContent } from '@edtc/shared'
import { useMemo } from 'react'
import { css } from 'styled-system/css'
import { Badge } from '~/components/ui/Badge'
import { ImageIcon } from '~/components/ui/Icons'
import { blogImageUrl } from './image'
import { renderMarkdown } from './markdown'

/** Markdownを描画した本文の見た目 */
const proseStyle = css({
  lineHeight: '1.9',
  wordBreak: 'break-word',
  '& > * + *': { mt: 'md' },
  '& h1, & h2, & h3': { fontWeight: '700', lineHeight: '1.4', mt: 'xl' },
  '& > :first-child': { mt: 0 },
  '& h1': { fontSize: 'xl' },
  '& h2': { fontSize: 'lg', pb: 'xs', borderBottomWidth: '1px' },
  '& h3': { fontSize: 'md' },
  '& ul': { listStyle: 'disc', pl: 'lg' },
  '& ol': { listStyle: 'decimal', pl: 'lg' },
  '& li + li': { mt: 'xs' },
  '& blockquote': { pl: 'md', color: 'fg.muted', borderLeftWidth: '3px', borderLeftColor: 'border.strong' },
  '& img': { w: 'full', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 'md' },
  '& a': { textDecoration: 'underline' },
  '& code': { fontFamily: 'mono', fontSize: '0.9em', px: '4px', bg: 'surface.muted', borderRadius: 'sm' },
  '& pre': { p: 'md', bg: 'surface.muted', borderRadius: 'md', overflowX: 'auto' },
  '& pre code': { p: 0, bg: 'transparent' },
  '& table': { w: 'full', borderCollapse: 'collapse', fontSize: 'sm' },
  '& th, & td': { borderWidth: '1px', px: 'sm', py: 'xs' },
  '& hr': { borderTopWidth: '1px' },
})

export function MarkdownBody({ postId, body }: { postId: string; body: string }) {
  const html = useMemo(() => renderMarkdown(body, postId), [body, postId])
  if (!body.trim()) return <p className={css({ color: 'fg.subtle', fontSize: 'sm' })}>本文がここにプレビューされます</p>
  return <div className={proseStyle} dangerouslySetInnerHTML={{ __html: html }} />
}

/** 記事一覧に並んだときのカード */
export function ListCardPreview({ postId, content }: { postId: string; content: BlogPostContent }) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', borderWidth: '1px', borderRadius: 'md', overflow: 'hidden' })}>
      <div className={css({ aspectRatio: '16 / 9', bg: 'surface.muted', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'fg.subtle' })}>
        {content.thumbnail ? (
          <img src={blogImageUrl(postId, content.thumbnail)} alt="" className={css({ w: 'full', h: 'full', objectFit: 'cover' })} />
        ) : (
          <ImageIcon size={28} />
        )}
      </div>
      <div className={css({ p: 'sm', display: 'flex', flexDirection: 'column', gap: '2px' })}>
        <p className={css({ fontSize: 'xs', color: 'fg.subtle' })}>{content.eventDate || '日付未入力'}</p>
        <p className={css({ fontWeight: '700' })}>{content.title || '（タイトル未入力）'}</p>
        <p className={css({ fontSize: 'sm', color: 'fg.muted', lineClamp: 2 })}>{content.description}</p>
        <p className={css({ fontSize: 'xs', color: 'accent.fg' })}>{content.tags.map((tag) => `#${tag}`).join(' ')}</p>
      </div>
    </div>
  )
}

/** 記事ページ全体（閲覧用） */
export function ArticlePreview({ postId, content, articleId: fixedId }: { postId: string; content: BlogPostContent; articleId?: string | null }) {
  const articleId = fixedId || articleIdBase(content.eventDate, content.series)
  return (
    <article className={css({ display: 'flex', flexDirection: 'column', gap: 'md', maxW: '760px' })}>
      <header className={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'xs' })}>
          {content.tags.map((tag) => (
            <Badge key={tag} tone="accent">
              {tag}
            </Badge>
          ))}
        </div>
        <h2 className={css({ fontSize: '2xl', fontWeight: '700' })}>{content.title || '（タイトル未入力）'}</h2>
        <p className={css({ fontSize: 'sm', color: 'fg.muted' })}>
          イベント実施日: {content.eventDate || '未入力'}・執筆: {content.authorName}
          {articleId && <span className={css({ ml: 'sm', color: 'fg.subtle' })}>（{articleId}）</span>}
        </p>
      </header>
      {content.thumbnail && (
        <img src={blogImageUrl(postId, content.thumbnail)} alt="" className={css({ w: 'full', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 'md' })} />
      )}
      <MarkdownBody postId={postId} body={content.body} />
    </article>
  )
}
