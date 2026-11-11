import { PARTICIPANT_ROLE_LABELS, romanizedName } from '@edtc/shared'
import { unzipSync, zipSync } from 'fflate'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '~/lib/api'
import { loadSummaryPhoto } from './photo'
import { fillSummaryTemplate, summaryFileName } from './summary-export'
import activityTemplateUrl from './template/activity-report.xlsx?url'
import summaryTemplateUrl from './template/summary-report.xlsx?url'
import { checkRadio, download, jstDate, readXml, recalcOnLoad, setCell, setFormulaResult, slashDate, writeXml, XLSX_TYPE, type XlsxFiles } from './xlsx'

type ExportedReport = InferResponseType<typeof api.reports.export.$get, 200>['reports'][number]

/** 活動評価のラジオボタン（左から 1:悪 〜 5:良）。様式の ctrlProp と、古いExcel向けの VML の図形 */
const RATING_CONTROLS = [
  { ctrlProp: 'xl/ctrlProps/ctrlProp1.xml', vmlShape: '_x0000_s1099' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp2.xml', vmlShape: '_x0000_s1101' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp3.xml', vmlShape: '_x0000_s1102' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp4.xml', vmlShape: '_x0000_s1103' },
  { ctrlProp: 'xl/ctrlProps/ctrlProp5.xml', vmlShape: '_x0000_s1104' },
]

const SHEET = 'xl/worksheets/sheet1.xml'
/** 署名欄のシート（本人の欄に、本書の氏名から姓を切り出す式がある） */
const SIGNATURE_SHEET = 'xl/worksheets/sheet2.xml'
const VML = 'xl/drawings/vmlDrawing1.vml'

const hour = (dateTime: string | null) => (dateTime ? Number(dateTime.slice(11, 13)) : null)
const minute = (dateTime: string | null) => (dateTime ? Number(dateTime.slice(14, 16)) : null)

/** ファイル名: イベントの実施日 + 書いた人のローマ字名（20260912TanakaTaro） */
export function reportFileName(report: ExportedReport): string {
  return `${report.event.startsAt.slice(0, 10).replace(/-/g, '')}${romanizedName(report.author.lastNameKana, report.author.firstNameKana)}`
}

/** 活動報告書の様式（シン・活動報告書）に1枚分を入れた .xlsx を作る */
function fillTemplate(template: XlsxFiles, report: ExportedReport): Uint8Array {
  const files = { ...template }
  const { event, author } = report

  let sheet = readXml(files, SHEET)
  const cells: [string, string | number | null][] = [
    ['K4', report.submittedAt ? slashDate(jstDate(report.submittedAt)) : null],
    ['B8', author.studentId],
    ['D8', report.division],
    // 署名欄のシートが「姓 名」の空白で姓を切り出すので、半角空白でつなぐ
    ['G8', `${author.lastName} ${author.firstName}`],
    ['B12', slashDate(event.startsAt)],
    ['D12', hour(event.startsAt)],
    ['F12', minute(event.startsAt)],
    ['H12', hour(event.endsAt)],
    ['J12', minute(event.endsAt)],
    ['C14', event.title],
    ['C17', event.location],
    ['C20', report.role ? PARTICIPANT_ROLE_LABELS[report.role] : null],
    ['C23', report.content],
    ['C29', report.reflection],
    ['C39', report.notes],
  ]
  for (const [ref, value] of cells) sheet = setCell(sheet, ref, value)
  // 事後報告の文字数（LEN は UTF-16 の長さ）
  sheet = setFormulaResult(sheet, 'M34', report.reflection.length)
  writeXml(files, SHEET, sheet)
  writeXml(files, SIGNATURE_SHEET, setFormulaResult(readXml(files, SIGNATURE_SHEET), 'D6', author.lastName))

  checkRadio(files, RATING_CONTROLS, VML, report.rating)
  // 文字数（LEN）と署名欄の式を、開いたときに計算し直させる
  recalcOnLoad(files)
  return zipSync(files)
}

const loadTemplate = (url: string) =>
  fetch(url)
    .then((res) => res.arrayBuffer())
    .then((buffer) => unzipSync(new Uint8Array(buffer)))

/**
 * 承認済みの活動報告書・まとめ報告書を、それぞれの様式で書き出す。1件なら .xlsx、複数なら1件1ファイルにまとめた .zip。
 * 書き出した件数を返す
 */
export async function exportReports(target: { eventId?: string; reportId?: string }, zipName: string): Promise<number> {
  const [{ reports }, { summaries }] = await Promise.all([
    unwrap(api.reports.export.$get({ query: target })),
    unwrap(api.reports.summaries.export.$get({ query: target })),
  ])
  const [activityTemplate, summaryTemplate] = await Promise.all([
    reports.length > 0 ? loadTemplate(activityTemplateUrl) : null,
    summaries.length > 0 ? loadTemplate(summaryTemplateUrl) : null,
  ])
  // まとめ報告書の活動写真（Excelの枠に貼る）
  const summaryPhotos = await Promise.all(summaries.map((summary) => Promise.all(summary.photos.map((fileName) => loadSummaryPhoto(summary.id, fileName)))))
  const files = [
    ...(summaryTemplate ? summaries.map((summary, index) => ({ name: summaryFileName(summary), build: () => fillSummaryTemplate(summaryTemplate, summary, summaryPhotos[index]) })) : []),
    ...(activityTemplate ? reports.map((report) => ({ name: reportFileName(report), build: () => fillTemplate(activityTemplate, report) })) : []),
  ]
  if (files.length === 0) return 0

  if (files.length === 1) {
    download(files[0].build(), `${files[0].name}.xlsx`, XLSX_TYPE)
    return 1
  }

  // 同じ日に同じ名前の人がいれば _2, _3 … を付ける
  const used = new Map<string, number>()
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    const count = (used.get(file.name) ?? 0) + 1
    used.set(file.name, count)
    entries[`${count > 1 ? `${file.name}_${count}` : file.name}.xlsx`] = file.build()
  }
  download(zipSync(entries), zipName, 'application/zip')
  return files.length
}
