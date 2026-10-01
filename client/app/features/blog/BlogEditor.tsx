import { BLOG_SERIES, validateForSubmit, type BlogPostContent } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useBlocker, useFetcher } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { ChipCheckbox, SelectField, TextareaField, TextField } from '~/components/ui/Field'
import { SaveIcon, TrashIcon } from '~/components/ui/Icons'
import type { FormErrors } from '~/lib/form'
import { ListCardPreview, MarkdownBody } from './ArticlePreview'
import { contentOf } from './content'
import { ImagePicker } from './ImagePicker'
import { MarkdownEditor } from './MarkdownEditor'
import { SubmitPanel } from './SubmitPanel'
import type { PostDetailResponse } from './types'

export type EditorIntent = 'save' | 'submit' | 'delete'
export type EditorActionData = (FormErrors & { intent: EditorIntent }) | { ok: true; intent: EditorIntent; prUrl?: string }

export function BlogEditor({ post, availableTags, hasUnsubmittedChanges, githubConfigured }: PostDetailResponse) {
  const [content, setContent] = useState<BlogPostContent>(() => contentOf(post))
  const fetcher = useFetcher<EditorActionData>()
  const pendingIntent = fetcher.state === 'idle' ? null : (fetcher.json as { intent?: EditorIntent } | undefined)?.intent
  const dirty = JSON.stringify(content) !== JSON.stringify(contentOf(post))
  const problems = validateForSubmit(content, { seriesOptional: !!post.articleId })
  const fieldErrors = fetcher.data && 'fieldErrors' in fetcher.data ? (fetcher.data.fieldErrors ?? {}) : {}
  const locked = !!post.publishedAt

  const set = <K extends keyof BlogPostContent>(key: K, value: BlogPostContent[K]) => setContent((prev) => ({ ...prev, [key]: value }))
  const send = (intent: EditorIntent) => fetcher.submit({ intent, content }, { method: 'post', encType: 'application/json' })

  // 未保存のまま離れようとしたら確認する
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Ctrl/Cmd + S で保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (dirty && fetcher.state === 'idle') send('save')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 管理者が削除したタグが記事に残っている場合も外せるようにする
  const tagLabels = [...availableTags.map((tag) => tag.label), ...content.tags.filter((tag) => !availableTags.some((t) => t.label === tag))]

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
      {blocker.state === 'blocked' && (
        <Alert tone="warning">
          保存していない変更があります。
          <span className={css({ display: 'inline-flex', gap: 'sm', ml: 'md' })}>
            <Button size="sm" onClick={() => blocker.reset()}>編集に戻る</Button>
            <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>破棄して移動</Button>
          </span>
        </Alert>
      )}
      {fetcher.state === 'idle' && fetcher.data && 'error' in fetcher.data && fetcher.data.error && <Alert>{fetcher.data.error}</Alert>}
      {fetcher.state === 'idle' && fetcher.data && 'ok' in fetcher.data && fetcher.data.intent === 'submit' && (
        <Alert tone="success">
          提出しました。<a href={fetcher.data.prUrl} target="_blank" rel="noopener noreferrer">PRを見る</a>
        </Alert>
      )}

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
        <Card title="記事の情報">
          <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
            <TextField label="タイトル" value={content.title} onChange={(e) => set('title', e.currentTarget.value)} required error={fieldErrors.title} placeholder="例: 第一回遊行塾に行ってきました！" />
            <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: 'md' })}>
              <TextField label="イベント実施日" type="date" value={content.eventDate} onChange={(e) => set('eventDate', e.currentTarget.value)} required disabled={locked} error={fieldErrors.eventDate} />
              <SelectField
                label="イベント種別"
                value={content.series}
                onChange={(e) => set('series', e.currentTarget.value)}
                required={!post.articleId}
                disabled={locked}
                error={fieldErrors.series}
              >
                <option value="">{post.articleId ? '（今の記事IDのまま）' : '選択してください'}</option>
                {BLOG_SERIES.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <TextField label="執筆者名" value={content.authorName} onChange={(e) => set('authorName', e.currentTarget.value)} required hint="サイトに表示される名前" />
            <TextareaField label="一覧用の説明文" value={content.description} onChange={(e) => set('description', e.currentTarget.value)} rows={2} required error={fieldErrors.description} />
            <fieldset>
              <legend className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>タグ</legend>
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' })}>
                {tagLabels.map((tag) => (
                  <ChipCheckbox
                    key={tag}
                    label={availableTags.some((t) => t.label === tag) ? tag : `${tag}（削除済み）`}
                    checked={content.tags.includes(tag)}
                    onChange={(e) => set('tags', e.currentTarget.checked ? [...content.tags, tag] : content.tags.filter((t) => t !== tag))}
                  />
                ))}
              </div>
            </fieldset>
            <div className={css({ maxW: '320px' })}>
              <p className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>サムネイル</p>
              <ImagePicker postId={post.id} label="サムネイル" fileName={content.thumbnail} onChange={(fileName) => set('thumbnail', fileName)} />
            </div>
          </div>
        </Card>

        <div className={css({ display: 'flex', flexDirection: 'column', gap: 'lg' })}>
          <Card title="保存">
            <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
              <span className={css({ flex: 1, fontSize: 'sm', color: dirty ? 'warning.fg' : 'fg.subtle' })}>{dirty ? '未保存の変更があります' : '保存済み'}</span>
              {post.status === 'draft' && !post.publishedAt && (
                <Button variant="ghost" size="sm" loading={pendingIntent === 'delete'} onClick={() => confirm('この下書きを削除しますか？') && send('delete')}>
                  <TrashIcon size={14} />
                  削除
                </Button>
              )}
              <Button variant="secondary" onClick={() => send('save')} loading={pendingIntent === 'save'} disabled={!dirty}>
                <SaveIcon size={16} />
                保存
              </Button>
            </div>
          </Card>
          <SubmitPanel
            post={post}
            problems={problems}
            hasUnsubmittedChanges={hasUnsubmittedChanges || (dirty && !!post.submittedAt)}
            githubConfigured={githubConfigured}
            submitting={pendingIntent === 'submit'}
            onSubmit={() => send('submit')}
          />
          <Card title="一覧での表示">
            <ListCardPreview postId={post.id} content={content} />
          </Card>
        </div>
      </div>

      <Card title="本文">
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '1fr 1fr' }, gap: 'lg', alignItems: 'stretch' })}>
          <MarkdownEditor postId={post.id} value={content.body} onChange={(body) => set('body', body)} />
          <section aria-label="プレビュー" className={css({ minW: 0, maxH: { lg: '640px' }, overflowY: 'auto', p: 'md', borderWidth: '1px', borderRadius: 'md' })}>
            <MarkdownBody postId={post.id} body={content.body} />
          </section>
        </div>
      </Card>
    </div>
  )
}
