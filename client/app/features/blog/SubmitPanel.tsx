import { css } from 'styled-system/css'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { ExternalLinkIcon, SendIcon } from '~/components/ui/Icons'
import { formatTimestamp } from '~/lib/format'
import { PostStatusBadge } from './PostStatusBadge'
import type { PostDetail } from './types'

type Props = {
  post: PostDetail
  problems: string[]
  hasUnsubmittedChanges: boolean
  githubConfigured: boolean
  submitting: boolean
  onSubmit: () => void
}

/** 公開フローの説明・状態・提出ボタン */
export function SubmitPanel({ post, problems, hasUnsubmittedChanges, githubConfigured, submitting, onSubmit }: Props) {
  const label = post.status === 'in_review' ? '修正版を提出' : post.publishedAt ? '修正を提出' : '提出する'
  return (
    <Card title="公開">
      <div className={css({ display: 'flex', flexDirection: 'column', gap: 'md', fontSize: 'sm' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
          <PostStatusBadge status={post.status} />
          {post.submittedAt && <span className={css({ color: 'fg.subtle', fontSize: 'xs' })}>最終提出 {formatTimestamp(post.submittedAt)}</span>}
        </div>
        {post.prUrl && (
          <a href={post.prUrl} target="_blank" rel="noopener noreferrer" className={css({ display: 'inline-flex', alignItems: 'center', gap: 'xs' })}>
            <ExternalLinkIcon size={14} />
            GitHubでレビューの状況を見る（#{post.prNumber}）
          </a>
        )}
        {hasUnsubmittedChanges && <Alert tone="info">提出後に変更があります。反映するには再提出してください。</Alert>}
        <p className={css({ color: 'fg.muted' })}>
          提出しても、すぐにホームページ（kaitedtc.com）に載るわけではありません。レビュー依頼が出され、確認が終わると公開されます。レビューでの指摘や公開はDiscordでお知らせします。
        </p>
        {!githubConfigured && <Alert tone="warning">GitHub連携が設定されていないため提出できません。管理者に連絡してください。</Alert>}
        <ProblemList title="提出前に必要なこと" problems={problems} />
        <Button variant="primary" onClick={onSubmit} loading={submitting} disabled={problems.length > 0 || !githubConfigured}>
          <SendIcon size={16} />
          {label}
        </Button>
      </div>
    </Card>
  )
}

/** 提出前チェックで足りないものの一覧（なければ何も出さない） */
export function ProblemList({ title, problems }: { title: string; problems: string[] }) {
  if (problems.length === 0) return null
  return (
    <div className={css({ fontSize: 'sm' })}>
      <p className={css({ fontWeight: '600', mb: 'xs' })}>{title}</p>
      <ul className={css({ display: 'flex', flexDirection: 'column', gap: '2px', color: 'warning.fg', listStyle: 'disc', pl: 'lg' })}>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  )
}
