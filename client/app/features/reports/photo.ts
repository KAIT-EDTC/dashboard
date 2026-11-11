import { SUMMARY_LIMITS } from '@edtc/shared'
import { API_URL } from '~/lib/api'

/** まとめ報告書の活動写真。ExcelはWebPを貼れないのでJPEGで保存する */

export const summaryPhotoUrl = (reportId: string, fileName: string) => `${API_URL}/api/reports/summaries/${reportId}/photos/${fileName}`

/** Excelの枠は小さいので、長い辺1600pxまでに縮小する */
const ATTEMPTS: [maxSide: number, quality: number][] = [
  [1600, 0.85],
  [1280, 0.8],
  [1024, 0.75],
]

async function convertToJpeg(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください')
  const bitmap = await createImageBitmap(file)
  try {
    for (const [maxSide, quality] of ATTEMPTS) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('画像を変換できませんでした')
      // 透過部分が黒くならないよう白で塗ってから描く
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (!blob) throw new Error('画像を変換できませんでした')
      if (blob.size <= SUMMARY_LIMITS.photos.maxBytes) return blob
    }
    throw new Error('画像のサイズが大きすぎます')
  } finally {
    bitmap.close()
  }
}

async function request(path: string, init: RequestInit): Promise<void> {
  const res = await fetch(`${API_URL}/api/reports/summaries/${path}`, { credentials: 'include', ...init })
  if (res.status === 401) throw new Error('ログインの有効期限が切れました。再読み込みしてください')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? '写真を保存できませんでした')
  }
}

/** 写真はバイナリをそのまま送るため、RPCクライアントではなく fetch を使う */
export async function uploadSummaryPhoto(reportId: string, file: File): Promise<void> {
  const body = await convertToJpeg(file)
  await request(`${reportId}/photos`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body })
}

export async function deleteSummaryPhoto(reportId: string, fileName: string): Promise<void> {
  await request(`${reportId}/photos/${fileName}`, { method: 'DELETE' })
}

/** Excelに貼るための写真の中身と大きさ */
export async function loadSummaryPhoto(reportId: string, fileName: string): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const res = await fetch(summaryPhotoUrl(reportId, fileName), { credentials: 'include' })
  if (!res.ok) throw new Error('写真を読み込めませんでした')
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)
  try {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}
