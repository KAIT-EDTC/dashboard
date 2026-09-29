/**
 * ブログ記事の形式。ダッシュボードが EDTCHP に PR する記事は次の形になる:
 *
 *   <BLOG_CONTENT_DIR>/<記事ID>/index.md        … frontmatter + Markdown本文
 *   <BLOG_CONTENT_DIR>/<記事ID>/img-xxxxxxxx.webp … 本文・サムネイルの画像（index.md から相対参照）
 *
 * 記事IDは「YY-MM-DD-slug」（例: 26-05-16-yugyou01）。旧サイトのURLと同じ規則。
 */

/** 記事に付けられるタグ（ダッシュボードとサイトで共通の語彙） */
export const BLOG_TAGS = ['ピックアップ', '遊行塾', 'イベント', '対外活動', '遊び'] as const
export type BlogTag = (typeof BLOG_TAGS)[number]

export const BLOG_STATUSES = ['draft', 'in_review', 'published'] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]
export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  draft: '下書き',
  in_review: 'レビュー中',
  published: '公開済み',
}

/** 記事IDのうち日付以降の部分（例: yugyou01） */
export const SLUG_PATTERN = /^[A-Za-z0-9_]+$/

/** アップロードした画像のファイル名。記事フォルダの中にこの名前で置かれる */
export const IMAGE_FILE_PATTERN = /^img-[a-z0-9]{8}\.webp$/

export type BlogPostContent = {
  title: string
  /** イベント実施日 YYYY-MM-DD */
  eventDate: string
  slug: string
  /** 記事一覧・OGPに使う短い説明 */
  description: string
  authorName: string
  tags: BlogTag[]
  /** サムネイル画像のファイル名 */
  thumbnail: string | null
  /** Markdown。画像は ![説明](./img-xxxxxxxx.webp) で参照する */
  body: string
}

/** 2026-05-16 + yugyou01 → 26-05-16-yugyou01 */
export function buildArticleId(eventDate: string, slug: string): string {
  const m = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m || !SLUG_PATTERN.test(slug)) return ''
  return `${m[1].slice(2)}-${m[2]}-${m[3]}-${slug}`
}

/** 本文中の画像（![alt](src)）をすべて取り出す */
export function imagesInBody(body: string): { alt: string; src: string }[] {
  return [...body.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => ({
    alt: m[1].trim(),
    src: m[2],
  }))
}

/** ./img-xxxxxxxx.webp → img-xxxxxxxx.webp（アップロード画像でなければ null） */
export function uploadedImageName(src: string): string | null {
  const name = src.replace(/^\.\//, '')
  return IMAGE_FILE_PATTERN.test(name) ? name : null
}

/** 記事が使っている画像のファイル名（サムネイル＋本文） */
export function referencedImages(content: Pick<BlogPostContent, 'thumbnail' | 'body'>): string[] {
  const names = imagesInBody(content.body)
    .map((image) => uploadedImageName(image.src))
    .filter((name): name is string => !!name)
  return [...new Set([...(content.thumbnail ? [content.thumbnail] : []), ...names])]
}

/** YAMLの文字列。JSONの文字列リテラルはそのままYAMLのダブルクォート文字列として読める */
const yamlString = (value: string) => JSON.stringify(value)

/** index.md の中身（frontmatter + 本文） */
export function buildMarkdown(content: BlogPostContent): string {
  const frontmatter = [
    `title: ${yamlString(content.title.trim())}`,
    `date: ${content.eventDate}`,
    `author: ${yamlString(content.authorName.trim())}`,
    `description: ${yamlString(content.description.trim())}`,
    `tags: [${content.tags.map(yamlString).join(', ')}]`,
    ...(content.thumbnail ? [`thumbnail: ./${content.thumbnail}`] : []),
  ]
  const body = content.body.replace(/\r\n/g, '\n').trim()
  return `---\n${frontmatter.join('\n')}\n---\n\n${body}\n`
}

/** PR作成（提出）前のチェック */
export function validateForSubmit(content: BlogPostContent): string[] {
  const errors: string[] = []
  if (!content.title.trim()) errors.push('タイトルを入力してください')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(content.eventDate)) errors.push('イベント実施日を入力してください')
  if (!content.slug) errors.push('記事IDを入力してください')
  else if (!SLUG_PATTERN.test(content.slug)) errors.push('記事IDは半角英数字と _ のみ使用できます')
  if (!content.description.trim()) errors.push('一覧用の説明文を入力してください')
  if (!content.authorName.trim()) errors.push('執筆者名を入力してください')
  if (content.tags.length === 0) errors.push('タグを1つ以上選択してください')
  if (!content.thumbnail) errors.push('サムネイル画像を設定してください')
  if (!content.body.trim()) errors.push('本文を入力してください')
  if (/<\s*(img|script|iframe)\b/i.test(content.body)) {
    errors.push('本文にHTMLの画像・スクリプトタグは使えません。画像は ![説明](...) の形で追加してください')
  }
  for (const image of imagesInBody(content.body)) {
    if (!uploadedImageName(image.src)) {
      errors.push(`外部の画像は使えません。アップロードしてください: ${image.src}`)
    } else if (!image.alt) {
      errors.push(`画像に説明（alt）を入力してください: ${image.src}`)
    }
  }
  return errors
}
