import { and, eq, inArray } from 'drizzle-orm'
import { buildMarkdown, referencedImages, type BlogPostContent } from '@edtc/shared'
import type { Db } from '../../db'
import { blogImages } from '../../db/schema'
import type { Bindings } from '../../env'
import { createRepoClient, GitHubError, type GitHubRepoClient } from '../../lib/github'

type Base = {
  defaultBranch: string
  commitSha: string
  treeSha: string
}

export type PublishTarget = {
  id: string
  prNumber: number | null
  articleId: string
  submittedContent: BlogPostContent
  /** PR本文・コミットに載せる執筆者表記 */
  authorLabel: string
}

export type SyncResult = {
  branch: string
  prNumber: number
  prUrl: string
  created: boolean
}

/**
 * ダッシュボードの記事を EDTCHP へのPRとして反映する。
 *
 * 記事は <BLOG_CONTENT_DIR>/<記事ID>/ に index.md と画像をまとめて置く。
 * ブランチは提出のたびに「最新のデフォルトブランチ + 記事の1コミット」として作り直すので、
 * 記事の正はダッシュボード側になる（PR上で直接編集した内容は次の再提出で上書きされる）。
 */
export class BlogPublisher {
  private base?: Promise<Base>

  private constructor(
    private readonly gh: GitHubRepoClient,
    private readonly db: Db,
    private readonly env: Bindings,
  ) {}

  static async create(env: Bindings, db: Db) {
    return new BlogPublisher(await createRepoClient(env), db, env)
  }

  articleDir(articleId: string) {
    return `${this.env.BLOG_CONTENT_DIR.replace(/\/+$/, '')}/${articleId}`
  }

  private loadBase(): Promise<Base> {
    this.base ??= (async () => {
      const repo = await this.gh.request<{ default_branch: string }>('GET', '')
      const ref = await this.gh.request<{ object: { sha: string } }>('GET', `/git/ref/heads/${repo.default_branch}`)
      const commit = await this.gh.request<{ tree: { sha: string } }>('GET', `/git/commits/${ref.object.sha}`)
      return { defaultBranch: repo.default_branch, commitSha: ref.object.sha, treeSha: commit.tree.sha }
    })()
    return this.base
  }

  async articleExists(articleId: string): Promise<boolean> {
    const { commitSha } = await this.loadBase()
    try {
      await this.gh.request('GET', `/contents/${this.articleDir(articleId)}/index.md?ref=${commitSha}`)
      return true
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return false
      throw error
    }
  }

  async sync(target: PublishTarget): Promise<SyncResult> {
    const base = await this.loadBase()
    const content = target.submittedContent
    const { articleId } = target
    const dir = this.articleDir(articleId)
    const branch = `blog/${target.id}`

    const fileNames = referencedImages(content)
    const rows = fileNames.length
      ? await this.db
          .select()
          .from(blogImages)
          .where(and(eq(blogImages.postId, target.id), inArray(blogImages.fileName, fileNames)))
      : []
    const missing = fileNames.filter((name) => !rows.some((row) => row.fileName === name))
    if (missing.length > 0) throw new Error(`画像が見つかりません: ${missing.join(', ')}`)

    const createTree = async (reuseUploadedBlobs: boolean) => {
      const entries: Record<string, string>[] = [
        { path: `${dir}/index.md`, mode: '100644', type: 'blob', content: buildMarkdown(content) },
      ]
      for (const row of rows) {
        let sha = reuseUploadedBlobs ? row.gitBlobSha : null
        if (!sha) {
          const blob = await this.gh.request<{ sha: string }>('POST', '/git/blobs', { content: row.data, encoding: 'base64' })
          sha = blob.sha
          await this.db
            .update(blogImages)
            .set({ gitBlobSha: sha })
            .where(and(eq(blogImages.postId, row.postId), eq(blogImages.fileName, row.fileName)))
        }
        entries.push({ path: `${dir}/${row.fileName}`, mode: '100644', type: 'blob', sha })
      }
      return this.gh.request<{ sha: string }>('POST', '/git/trees', { base_tree: base.treeSha, tree: entries })
    }

    let tree: { sha: string }
    try {
      tree = await createTree(true)
    } catch (error) {
      // 以前アップロードしたblobがGitHub側で消えていたら上げ直す
      if (!(error instanceof GitHubError && error.status === 422)) throw error
      tree = await createTree(false)
    }

    const commit = await this.gh.request<{ sha: string }>('POST', '/git/commits', {
      message: `blog: ${content.title}\n\n記事ID: ${articleId}\n執筆: ${target.authorLabel}\n\nEDTCダッシュボードから作成`,
      tree: tree.sha,
      parents: [base.commitSha],
    })

    try {
      await this.gh.request('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha, force: true })
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 422)) throw error
      await this.gh.request('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha })
    }

    const title = `[Blog] ${content.title}`
    const body = this.pullRequestBody(target, articleId, dir)
    if (target.prNumber) {
      const pr = await this.gh.request<{ number: number; html_url: string; state: string }>(
        'GET',
        `/pulls/${target.prNumber}`,
      )
      if (pr.state === 'open') {
        await this.gh.request('PATCH', `/pulls/${pr.number}`, { title, body })
        return { branch, prNumber: pr.number, prUrl: pr.html_url, created: false }
      }
    }
    const pr = await this.gh.request<{ number: number; html_url: string }>('POST', '/pulls', {
      title,
      body,
      head: branch,
      base: base.defaultBranch,
    })
    return { branch, prNumber: pr.number, prUrl: pr.html_url, created: true }
  }

  async deleteBranch(branch: string) {
    try {
      await this.gh.request('DELETE', `/git/refs/heads/${branch}`)
    } catch (error) {
      if (!(error instanceof GitHubError && (error.status === 404 || error.status === 422))) throw error
    }
  }

  private pullRequestBody(target: PublishTarget, articleId: string, dir: string): string {
    const content = target.submittedContent
    return [
      '## ブログ記事',
      '',
      '| 項目 | 内容 |',
      '| --- | --- |',
      `| タイトル | ${content.title} |`,
      `| 記事ID | \`${articleId}\` |`,
      `| イベント実施日 | ${content.eventDate} |`,
      `| 執筆者 | ${target.authorLabel} |`,
      `| タグ | ${content.tags.join(', ')} |`,
      '',
      `本文は \`${dir}/index.md\` の「Files changed」で画像つきで確認できます。`,
      '',
      `> このPRは [EDTCダッシュボード](${this.env.FRONTEND_URL}/blog/${target.id}) から自動作成されました。`,
      '> 修正が必要な場合はレビューコメントで伝えてください（執筆者にDiscordで通知されます）。',
      '> ブランチは再提出のたびに作り直されるため、このPRへの直接のコミットは上書きされます。',
      '',
      '## チェックリスト',
      '',
      '- [ ] 写真や本文に個人情報（顔・名札・校名など）が含まれていないか',
      '- [ ] 誤字脱字がないか',
      '- [ ] タグが適切か',
    ].join('\n')
  }
}
