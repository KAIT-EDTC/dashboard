import { MAX_IMAGE_BYTES } from '@edtc/shared'
import { API_URL } from '~/lib/api'

export const blogImageUrl = (postId: string, fileName: string) => `${API_URL}/api/blog/posts/${postId}/images/${fileName}`

/** サイトでは最大1600px幅で表示されるため、それ以上は縮小してWebPにする */
const ATTEMPTS: [maxWidth: number, quality: number][] = [
  [1600, 0.8],
  [1280, 0.75],
  [1024, 0.7],
]

/** 画像を選ぶ・貼り付ける・ドロップしたときの共通処理: WebPにしてアップロードし、ファイル名を返す */
export async function uploadImageFile(postId: string, file: File): Promise<string> {
  return uploadBlogImage(postId, await convertToWebp(file))
}

export async function convertToWebp(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください')
  const bitmap = await createImageBitmap(file)
  try {
    for (const [maxWidth, quality] of ATTEMPTS) {
      const scale = Math.min(1, maxWidth / bitmap.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
      if (!blob || blob.type !== 'image/webp') {
        throw new Error('このブラウザは画像のWebP変換に対応していません。Chrome・Edge・Firefoxなどをお使いください')
      }
      if (blob.size <= MAX_IMAGE_BYTES) return blob
    }
    throw new Error('画像のサイズが大きすぎます')
  } finally {
    bitmap.close()
  }
}

/** 画像はバイナリをそのまま送るため、RPCクライアントではなく fetch を使う。戻り値は記事フォルダ内のファイル名 */
export async function uploadBlogImage(postId: string, image: Blob): Promise<string> {
  const res = await fetch(`${API_URL}/api/blog/posts/${postId}/images`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'image/webp' },
    body: image,
  })
  const body = (await res.json().catch(() => ({}))) as { fileName?: string; error?: string }
  if (res.status === 401) throw new Error('ログインの有効期限が切れました。再読み込みしてください')
  if (!res.ok || !body.fileName) throw new Error(body.error ?? '画像のアップロードに失敗しました')
  return body.fileName
}
