import { uploadedImageName } from '@edtc/shared'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { blogImageUrl } from './image'

/**
 * 記事本文をHTMLにする。サイト側と同じく標準的なMarkdown（GFM）として解釈する。
 * 本文中の ./img-xxxxxxxx.webp はダッシュボードAPIの画像URLに置き換える。
 * 他のメンバーが書いた記事も表示するので、必ずサニタイズする。
 */
export function renderMarkdown(body: string, postId: string): string {
  const marked = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type !== 'image') return
      const fileName = uploadedImageName(token.href)
      if (fileName) token.href = blogImageUrl(postId, fileName)
    },
  })
  return DOMPurify.sanitize(marked.parse(body, { async: false }))
}
