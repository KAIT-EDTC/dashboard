import { HOSTING_LABELS, romanizedName, SUMMARY_LIMITS } from '@edtc/shared'
import { zipSync } from 'fflate'
import type { SummaryExport } from './types'
import { appendRows, checkRadio, jstDate, readXml, recalcOnLoad, setCell, slashDate, writeXml, type XlsxFiles } from './xlsx'

/** まとめ報告書の様式（シン・まとめ報告書 ver1.3.9）のセル */
const SHEET = 'xl/worksheets/sheet1.xml'
/** 追加記入欄（署名欄・自己評価のグラフの元データ）。様式に収まらない参加者もここに書き足す */
const EXTRA_SHEET = 'xl/worksheets/sheet2.xml'
const CHART = 'xl/charts/chart1.xml'
const VML = 'xl/drawings/vmlDrawing1.vml'
const DRAWING = 'xl/drawings/drawing1.xml'
const DRAWING_RELS = 'xl/drawings/_rels/drawing1.xml.rels'
const CONTENT_TYPES = '[Content_Types].xml'

/** 参加者欄（学籍番号 C・氏名 E）の行 */
const PARTICIPANT_ROWS = [14, 15, 16, 17, 18, 19, 20, 21]
/** 自己分析欄の「氏名：」の行（氏名 D・評価 G、その次の行 C に本文） */
const ANALYSIS_ROWS = [45, 52, 59, 66, 73, 80, 87]
/** 活動内容の「・」の行 */
const CONTENT_ROWS = [23, 24, 25]
/** 自己評価のグラフの元データ（評価 1〜5 の人数） */
const RATING_COUNT_ROWS = [11, 12, 13, 14, 15]
/** 追加記入欄で書き足し始める行（様式は31行目まで） */
const EXTRA_START_ROW = 34

/** 総合評価のラジオボタン（左から 1:悪 〜 5:良） */
const RATING_CONTROLS = [
  { ctrlProp: 'xl/ctrlProps/ctrlProp1.xml', vmlShape: '_x0000_s1099' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp2.xml', vmlShape: '_x0000_s1101' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp3.xml', vmlShape: '_x0000_s1102' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp4.xml', vmlShape: '_x0000_s1103' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp5.xml', vmlShape: '_x0000_s1104' },
]

/**
 * 「図1. 活動写真」の枠（罫線は B33〜G42）。列幅（文字数）と行の高さ（pt）は様式の値。
 * 写真は枠の中に横一列で、縦横比を保ったまま上下左右の間隔をそろえて置く
 */
const PHOTO_AREA = {
  /** B〜G列の幅（左から。0始まりの列番号は 1〜6） */
  columns: [14.8984375, 8.69921875, 15.796875, 8.796875, 8.796875, 16.69921875],
  firstColumn: 1,
  /** 33〜42行目の高さ（0始まりの行番号は 32〜41） */
  rows: [13.2, 18.6, 13.2, 13.2, 13.2, 13.2, 13.2, 13.2, 13.2, 13.2],
  firstRow: 32,
  /** 写真を置くと消す、枠の中の注意書き */
  guideCells: ['C36', 'C38'],
}
const EMU_PER_PX = 9525
const EMU_PER_PT = 12700
/** 列幅（文字数）→ px（標準フォントの数字の幅を7pxとして Excel と同じ式で換算） */
const columnPx = (width: number) => Math.trunc(((256 * width + Math.trunc(128 / 7)) / 256) * 7)

export type PhotoForExcel = { bytes: Uint8Array; width: number; height: number }

/** 枠の左上からの位置（EMU）を、セルとセル内のずれに直す */
function anchorAt(sizes: number[], first: number, offset: number): [index: number, offset: number] {
  let rest = offset
  for (let i = 0; i < sizes.length; i++) {
    if (rest < sizes[i] || i === sizes.length - 1) return [first + i, Math.max(0, Math.round(rest))]
    rest -= sizes[i]
  }
  return [first, 0]
}

/** 活動写真を図として貼る（Excelは drawing の oneCellAnchor、画像は xl/media に置く） */
function placePhotos(files: XlsxFiles, photos: PhotoForExcel[]) {
  if (photos.length === 0) return
  const columns = PHOTO_AREA.columns.map((width) => columnPx(width) * EMU_PER_PX)
  const rows = PHOTO_AREA.rows.map((height) => height * EMU_PER_PT)
  const areaWidth = columns.reduce((a, b) => a + b, 0)
  const areaHeight = rows.reduce((a, b) => a + b, 0)
  const gap = areaHeight * 0.08
  const slotWidth = (areaWidth - gap * (photos.length + 1)) / photos.length
  const slotHeight = areaHeight - gap * 2

  let anchors = ''
  let rels = ''
  photos.forEach((photo, index) => {
    const scale = Math.min(slotWidth / photo.width, slotHeight / photo.height)
    const cx = Math.round(photo.width * scale)
    const cy = Math.round(photo.height * scale)
    const x = gap + index * (slotWidth + gap) + (slotWidth - cx) / 2
    const y = gap + (slotHeight - cy) / 2
    const [col, colOff] = anchorAt(columns, PHOTO_AREA.firstColumn, x)
    const [row, rowOff] = anchorAt(rows, PHOTO_AREA.firstRow, y)
    const rId = `rIdPhoto${index + 1}`
    files[`xl/media/photo${index + 1}.jpeg`] = photo.bytes
    rels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/photo${index + 1}.jpeg"/>`
    anchors +=
      `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from>` +
      `<xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${1000 + index}" name="活動写真 ${index + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
      `<xdr:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
      `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`
  })

  let drawing = readXml(files, DRAWING)
  // r:embed を使うので、ルート要素に r の名前空間を宣言する（様式では中の図形ごとにしか宣言されていない）
  const root = drawing.match(/<xdr:wsDr[^>]*>/)?.[0] ?? ''
  if (!root.includes('xmlns:r=')) {
    drawing = drawing.replace('<xdr:wsDr ', '<xdr:wsDr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
  }
  writeXml(files, DRAWING, drawing.replace('</xdr:wsDr>', `${anchors}</xdr:wsDr>`))
  writeXml(files, DRAWING_RELS, readXml(files, DRAWING_RELS).replace('</Relationships>', `${rels}</Relationships>`))
  const types = readXml(files, CONTENT_TYPES)
  if (!types.includes('Extension="jpeg"')) {
    writeXml(files, CONTENT_TYPES, types.replace('<Default ', '<Default Extension="jpeg" ContentType="image/jpeg"/><Default '))
  }

  // 写真を置いたら枠の中の注意書きは消す
  let sheet = readXml(files, SHEET)
  for (const ref of PHOTO_AREA.guideCells) {
    sheet = sheet.replace(new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`), (_m, attrs: string) => `<c r="${ref}"${attrs.match(/ s="\d+"/)?.[0] ?? ''}/>`)
  }
  writeXml(files, SHEET, sheet)
}

const nameOf = (person: { lastName: string; firstName: string }) => `${person.lastName} ${person.firstName}`

/** ファイル名: イベントの実施日 + 担当者のローマ字名 + _まとめ（20260912TanakaTaro_まとめ） */
export function summaryFileName(summary: SummaryExport): string {
  return `${summary.event.startsAt.slice(0, 10).replace(/-/g, '')}${romanizedName(summary.author.lastNameKana, summary.author.firstNameKana)}_まとめ`
}

/** 自己評価のグラフ（評価ごとの人数）。グラフの表示用の値も更新しておく */
function fillRatingChart(files: XlsxFiles, counts: number[]) {
  let extra = readXml(files, EXTRA_SHEET)
  RATING_COUNT_ROWS.forEach((row, index) => {
    extra = setCell(extra, `C${row}`, counts[index])
  })
  writeXml(files, EXTRA_SHEET, extra)

  const points = counts.map((count, index) => `<c:pt idx="${index}"><c:v>${count}</c:v></c:pt>`).join('')
  writeXml(
    files,
    CHART,
    readXml(files, CHART).replace(
      /(\$C\$11:\$C\$15<\/c:f><c:numCache>[\s\S]*?<c:ptCount val="5"\/>)(?:<c:pt [\s\S]*?)?(<\/c:numCache>)/,
      `$1${points}$2`,
    ),
  )
}

/** まとめ報告書1件分を様式に入れた .xlsx を作る */
export function fillSummaryTemplate(template: XlsxFiles, summary: SummaryExport, photos: PhotoForExcel[] = []): Uint8Array {
  const files = { ...template }
  const { event, author, members } = summary
  const contentLines = summary.content.split('\n').slice(0, SUMMARY_LIMITS.content.lines)
  const detail = `（${slashDate(event.startsAt)}）,（場所：${event.location || '—'}）\n（${summary.hosting ? HOSTING_LABELS[summary.hosting] : '主催 or 参加'}）`

  let sheet = readXml(files, SHEET)
  const cells: [string, string | number | null][] = [
    ['G4', summary.submittedAt ? slashDate(jstDate(summary.submittedAt)) : null],
    ['B8', author.studentId],
    ['D8', summary.division],
    ['E8', nameOf(author)],
    ['C11', event.title],
    ...PARTICIPANT_ROWS.flatMap((row, index): [string, string | null][] => {
      const member = members[index]
      return member ? [[`C${row}`, member.studentId], [`E${row}`, nameOf(member)]] : []
    }),
    ...CONTENT_ROWS.map((row, index): [string, string | null] => [`C${row}`, contentLines[index] ? `・ ${contentLines[index]}` : null]),
    ['C27', detail],
    ...ANALYSIS_ROWS.flatMap((row, index): [string, string | number | null][] => {
      const member = members[index]
      return member ? [[`D${row}`, nameOf(member)], [`G${row}`, member.rating], [`C${row + 1}`, member.analysis]] : []
    }),
    ['B111', summary.overview],
    ['C120', summary.impressions],
    ['C139', summary.notes],
  ]
  for (const [ref, value] of cells) sheet = setCell(sheet, ref, value)
  writeXml(files, SHEET, sheet)

  // 様式の欄（参加者8人・自己分析7人）に収まらない人は追加記入欄に書き足す
  const extraRows: { row: number; cells: [string, string | number][] }[] = []
  let row = EXTRA_START_ROW
  const overflowParticipants = members.slice(PARTICIPANT_ROWS.length)
  if (overflowParticipants.length > 0) {
    extraRows.push({ row: row++, cells: [['B', '参加者（続き）']] })
    for (const member of overflowParticipants) extraRows.push({ row: row++, cells: [['B', member.studentId ?? ''], ['D', nameOf(member)]] })
    row++
  }
  const overflowAnalyses = members.slice(ANALYSIS_ROWS.length)
  if (overflowAnalyses.length > 0) {
    extraRows.push({ row: row++, cells: [['B', '自己分析（続き）']] })
    for (const member of overflowAnalyses) {
      extraRows.push({ row: row++, cells: [['B', `氏名：${nameOf(member)}`], ['G', `評価：${member.rating ?? ''}`]] })
      extraRows.push({ row: row++, cells: [['B', member.analysis]] })
    }
  }
  writeXml(files, EXTRA_SHEET, appendRows(readXml(files, EXTRA_SHEET), extraRows))

  const counts = [1, 2, 3, 4, 5].map((rating) => members.filter((m) => m.rating === rating).length)
  fillRatingChart(files, counts)
  placePhotos(files, photos)
  checkRadio(files, RATING_CONTROLS, VML, summary.rating)
  recalcOnLoad(files)
  return zipSync(files)
}
