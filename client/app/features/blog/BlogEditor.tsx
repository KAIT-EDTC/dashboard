import { BLOG_SERIES, validateBodyForSubmit, validateInfoForSubmit, type BlogPostContent } from '@edtc/shared'
import { useEffect, useState } from 'react'
import { useBlocker, useFetcher, useSearchParams } from 'react-router'
import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button, ButtonLink } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { ChipCheckbox, SelectField, TextareaField, TextField } from '~/components/ui/Field'
import { ChevronLeftIcon, ChevronRightIcon, SaveIcon, TrashIcon } from '~/components/ui/Icons'
import { TabLinks } from '~/components/ui/Tabs'
import type { FormErrors } from '~/lib/form'
import { ListCardPreview, MarkdownBody } from './ArticlePreview'
import { contentOf } from './content'
import { ImagePicker } from './ImagePicker'
import { MarkdownEditor } from './MarkdownEditor'
import { ProblemList, SubmitPanel } from './SubmitPanel'
import type { PostDetailResponse } from './types'

export type EditorIntent = 'save' | 'submit' | 'delete'
export type EditorActionData = (FormErrors & { intent: EditorIntent }) | { ok: true; intent: EditorIntent; prUrl?: string }

/** 初めての人でも迷わないよう、記事の情報 → 本文 → 提出 の順にタブで進める（?step= で切り替え）。足りないものはタブごとに出す */
const STEPS = [
  { id: 'info', label: '記事の情報', validate: validateInfoForSubmit },
  { id: 'body', label: '本文を書く', validate: validateBodyForSubmit },
  { id: 'submit', label: '提出', validate: () => [] },
] as const

export function BlogEditor({ post, hasUnsubmittedChanges, githubConfigured }: PostDetailResponse) {
  const [content, setContent] = useState<BlogPostContent>(() => contentOf(post))
  const fetcher = useFetcher<EditorActionData>()
  const pendingIntent = fetcher.state === 'idle' ? null : (fetcher.json as { intent?: EditorIntent } | undefined)?.intent
  const dirty = JSON.stringify(content) !== JSON.stringify(contentOf(post))
  const fieldErrors = fetcher.data && 'fieldErrors' in fetcher.data ? (fetcher.data.fieldErrors ?? {}) : {}
  const locked = !!post.publishedAt
  const [searchParams] = useSearchParams()
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.id === searchParams.get('step')))
  const step = STEPS[stepIndex].id
  const prev = STEPS[stepIndex - 1]
  const next = STEPS[stepIndex + 1]
  const stepProblems = STEPS.map((s) => s.validate(content))
  const problems = stepProblems.flat()

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
          提出してレビュー依頼を出しました（まだホームページには載っていません）。<a href={fetcher.data.prUrl} target="_blank" rel="noopener noreferrer">レビューの状況を見る</a>
        </Alert>
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'md' })}>
        <TabLinks items={STEPS.map((s, i) => ({ to: `?step=${s.id}`, label: `${i + 1}. ${s.label}${stepProblems[i].length > 0 ? `（不足 ${stepProblems[i].length}）` : ''}`, active: s.id === step }))} />
        <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm', ml: 'auto' })}>
          <span className={css({ fontSize: 'sm', color: dirty ? 'warning.fg' : 'fg.subtle' })}>{dirty ? '未保存の変更があります' : '保存済み'}</span>
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
      </div>

      {step === 'body' && (
        <Card title="本文">
          <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '1fr 1fr' }, gap: 'lg', alignItems: 'stretch' })}>
            <MarkdownEditor postId={post.id} value={content.body} onChange={(body) => set('body', body)} />
            <section aria-label="プレビュー" className={css({ minW: 0, maxH: { lg: '640px' }, overflowY: 'auto', p: 'md', borderWidth: '1px', borderRadius: 'md' })}>
              <MarkdownBody postId={post.id} body={content.body} />
            </section>
          </div>
        </Card>
      )}

      {step === 'info' && (
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 3fr) minmax(0, 2fr)' }, gap: 'lg', alignItems: 'start' })}>
          <Card title="記事の情報">
            <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md' })}>
              <TextField label="タイトル" value={content.title} onChange={(e) => set('title', e.currentTarget.value)} required error={fieldErrors.title} placeholder="例: 第一回遊行塾に行ってきました！" />
              <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: 'md' })}>
                <TextField label="イベント実施日" type="date" value={content.eventDate} onChange={(e) => set('eventDate', e.currentTarget.value)} required disabled={locked} error={fieldErrors.eventDate} />
                <SelectField
                  label="イベント種別"
                  value={content.series}
                  onChange={(e) => set('series', e.currentTarget.value as BlogPostContent['series'])}
                  required
                  error={fieldErrors.series}
                  hint="遊行塾・レク以外は、学内か学外かで選ぶ"
                >
                  <option value="">選択してください</option>
                  {BLOG_SERIES.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextField label="執筆者名" value={content.authorName} onChange={(e) => set('authorName', e.currentTarget.value)} required hint="ホームページに表示される名前" />
              <TextareaField label="一覧用の説明文" value={content.description} onChange={(e) => set('description', e.currentTarget.value)} rows={2} required error={fieldErrors.description} />
              <div>
                <ChipCheckbox label="ピックアップに載せる" checked={content.pickup} onChange={(e) => set('pickup', e.currentTarget.checked)} />
              </div>
              <div className={css({ maxW: '320px' })}>
                <p className={css({ fontSize: 'sm', fontWeight: '600', color: 'fg.muted', mb: '6px' })}>
                  サムネイル
                  <span className={css({ color: 'danger', ml: '2px' })}>*</span>
                </p>
                <ImagePicker postId={post.id} label="サムネイル" fileName={content.thumbnail} onChange={(fileName) => set('thumbnail', fileName)} />
              </div>
            </div>
          </Card>
          <Card title="一覧での表示">
            <ListCardPreview postId={post.id} content={content} />
          </Card>
        </div>
      )}

      {step === 'submit' && (
        <div className={css({ maxW: '640px' })}>
          <SubmitPanel
            post={post}
            problems={problems}
            hasUnsubmittedChanges={hasUnsubmittedChanges || (dirty && !!post.submittedAt)}
            githubConfigured={githubConfigured}
            submitting={pendingIntent === 'submit'}
            onSubmit={() => send('submit')}
          />
        </div>
      )}

      <ProblemList title={`「${STEPS[stepIndex].label}」で足りないもの`} problems={stepProblems[stepIndex]} />

      <div className={css({ display: 'flex', gap: 'sm' })}>
        {prev && (
          <ButtonLink to={`?step=${prev.id}`} replace>
            <ChevronLeftIcon size={16} />
            戻る
          </ButtonLink>
        )}
        {next && (
          <ButtonLink to={`?step=${next.id}`} replace variant="primary" className={css({ ml: 'auto' })}>
            次へ: {next.label}
            <ChevronRightIcon size={16} />
          </ButtonLink>
        )}
      </div>
    </div>
  )
}
